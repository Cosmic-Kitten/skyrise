import type { Config } from "@netlify/functions";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
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

  const [user] = await db.select().from(passkeyUsers).where(eq(passkeyUsers.username, username));
  if (!user) return Response.json({ error: "No passkey found for that runner name." }, { status: 404 });

  const creds = await db.select().from(passkeyCredentials).where(eq(passkeyCredentials.userId, user.id));
  if (creds.length === 0) return Response.json({ error: "No passkey found for that runner name." }, { status: 404 });

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: creds.map((c) => ({
      id: c.credentialId,
      transports: c.transports ? JSON.parse(c.transports) : undefined,
    })),
    userVerification: "preferred",
  });

  await storeChallenge(username, options.challenge);

  return Response.json(options);
};

export const config: Config = { path: "/api/webauthn/login-options" };
