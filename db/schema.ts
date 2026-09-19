import { pgTable, serial, text, integer, bigint, timestamp } from "drizzle-orm/pg-core";

export const passkeyUsers = pgTable("passkey_users", {
  id: serial().primaryKey(),
  username: text().notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const passkeyCredentials = pgTable("passkey_credentials", {
  id: serial().primaryKey(),
  userId: integer("user_id").notNull().references(() => passkeyUsers.id),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: bigint("counter", { mode: "number" }).notNull().default(0),
  transports: text("transports"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const passkeyChallenges = pgTable("passkey_challenges", {
  id: serial().primaryKey(),
  username: text().notNull(),
  challenge: text().notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});
