import type { Config } from "@netlify/functions";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { passkeyCredentials, passkeyUsers } from "../../db/schema.js";
import { consumeChallenge, normalizeUsername, resolveRelyingParty } from "../../db/webauthn.js";

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = await req.json().catch(() => null);
  const username = normalizeUsername(body?.username);
  const credential = body?.credential;
  if (!username || !credential) return Response.json({ error: "Missing registration data." }, { status: 400 });

  const challenge = await consumeChallenge(username);
  if (!challenge) return Response.json({ error: "That passkey request expired. Try again." }, { status: 400 });

  const { origin, rpID } = resolveRelyingParty(req);

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch {
    return Response.json({ error: "Could not verify that passkey." }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return Response.json({ error: "Could not verify that passkey." }, { status: 400 });
  }

  const { credential: cred } = verification.registrationInfo;

  try {
    let [user] = await db.select().from(passkeyUsers).where(eq(passkeyUsers.username, username));
    if (!user) {
      [user] = await db.insert(passkeyUsers).values({ username }).returning();
    }

    await db.insert(passkeyCredentials).values({
      userId: user.id,
      credentialId: cred.id,
      publicKey: isoBase64URL.fromBuffer(cred.publicKey),
      counter: cred.counter,
      transports: cred.transports ? JSON.stringify(cred.transports) : null,
    });
  } catch {
    return Response.json({ error: "This passkey is already registered." }, { status: 409 });
  }

  return Response.json({ verified: true, username });
};

export const config: Config = { path: "/api/webauthn/register-verify" };
