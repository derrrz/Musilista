ALTER TABLE "events" ADD COLUMN "public_token" uuid;
ALTER TABLE "events" ADD COLUMN "technical_rider" text;
ALTER TABLE "events" ADD CONSTRAINT "events_public_token_unique" UNIQUE("public_token");
