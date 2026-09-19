import { eq } from "drizzle-orm";
import { db } from "./index.js";
import { passkeyChallenges } from "./schema.js";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function normalizeUsername(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().toLowerCase();
  if (!trimmed || trimmed.length > 64) return null;
  return trimmed;
}

export function resolveRelyingParty(req: Request): { origin: string; rpID: string } {
  const originHeader = req.headers.get("origin") || new URL(req.url).origin;
  return { origin: originHeader, rpID: new URL(originHeader).hostname };
}

export async function storeChallenge(username: string, challenge: string): Promise<void> {
  await db.delete(passkeyChallenges).where(eq(passkeyChallenges.username, username));
  await db.insert(passkeyChallenges).values({ username, challenge });
}

export async function consumeChallenge(username: string): Promise<string | null> {
  const rows = await db.select().from(passkeyChallenges).where(eq(passkeyChallenges.username, username));
  await db.delete(passkeyChallenges).where(eq(passkeyChallenges.username, username));
  if (rows.length === 0) return null;
  const row = rows[rows.length - 1];
  if (Date.now() - row.createdAt.getTime() > CHALLENGE_TTL_MS) return null;
  return row.challenge;
}
