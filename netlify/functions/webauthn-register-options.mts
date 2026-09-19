import type { Config } from "@netlify/functions";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { passkeyCredentials, passkeyUsers } from "../../db/schema.js";
import { normalizeUsername, resolveRelyingParty, storeChallenge } from "../../db/webauthn.js";

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = await req.json().catch(() => null);
  const username = normalizeUsername(body?.username);
  if (!username) return Response.json({ error: "Enter a runner name first." }, { status: 400 });

  const { rpID } = resolveRelyingParty(req);

  const [existingUser] = await db.select().from(passkeyUsers).where(eq(passkeyUsers.username, username));
  let excludeCredentials: { id: string; transports?: string[] }[] = [];
  if (existingUser) {
    const creds = await db.select().from(passkeyCredentials).where(eq(passkeyCredentials.userId, existingUser.id));
    excludeCredentials = creds.map((c) => ({
      id: c.credentialId,
      transports: c.transports ? JSON.parse(c.transports) : undefined,
    }));
  }

  const options = await generateRegistrationOptions({
    rpName: "Sky Rise",
    rpID,
    userName: username,
    userID: isoUint8Array.fromUTF8String(username),
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  });

  await storeChallenge(username, options.challenge);

  return Response.json(options);
};

export const config: Config = { path: "/api/webauthn/register-options" };
