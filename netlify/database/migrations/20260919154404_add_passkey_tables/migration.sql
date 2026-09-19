CREATE TABLE "passkey_challenges" (
	"id" serial PRIMARY KEY,
	"username" text NOT NULL,
	"challenge" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passkey_credentials" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"credential_id" text NOT NULL UNIQUE,
	"public_key" text NOT NULL,
	"counter" bigint DEFAULT 0 NOT NULL,
	"transports" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passkey_users" (
	"id" serial PRIMARY KEY,
	"username" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "passkey_credentials" ADD CONSTRAINT "passkey_credentials_user_id_passkey_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "passkey_users"("id");