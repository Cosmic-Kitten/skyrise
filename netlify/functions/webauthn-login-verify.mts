import type { Config } from "@netlify/functions";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
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
  if (!username || !credential) return Response.json({ error: "Missing sign-in data." }, { status: 400 });

  const challenge = await consumeChallenge(username);
  if (!challenge) return Response.json({ error: "That passkey request expired. Try again." }, { status: 400 });

  const [user] = await db.select().from(passkeyUsers).where(eq(passkeyUsers.username, username));
  if (!user) return Response.json({ error: "No passkey found for that runner name." }, { status: 404 });

  const [storedCredential] = await db
    .select()
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.credentialId, credential.id));
  if (!storedCredential || storedCredential.userId !== user.id) {
    return Response.json({ error: "That passkey isn't registered to this runner." }, { status: 400 });
  }

  const { origin, rpID } = resolveRelyingParty(req);

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: storedCredential.credentialId,
        publicKey: isoBase64URL.toBuffer(storedCredential.publicKey),
        counter: storedCredential.counter,
        transports: storedCredential.transports ? JSON.parse(storedCredential.transports) : undefined,
      },
    });
  } catch {
    return Response.json({ error: "Could not verify that passkey." }, { status: 400 });
  }

  if (!verification.verified) {
    return Response.json({ error: "Could not verify that passkey." }, { status: 400 });
  }

  await db
    .update(passkeyCredentials)
    .set({ counter: verification.authenticationInfo.newCounter })
    .where(eq(passkeyCredentials.id, storedCredential.id));

  return Response.json({ verified: true, username });
};

export const config: Config = { path: "/api/webauthn/login-verify" };
