CREATE TABLE "voting_guest_ballots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"guest_id" uuid NOT NULL,
	"guest_name" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voting_guest_ballots_candidate_id_guest_id_unique" UNIQUE("candidate_id","guest_id")
);
--> statement-breakpoint
CREATE TABLE "voting_guest_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voting_round_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "voting_rounds" ADD COLUMN "invite_token" uuid;--> statement-breakpoint
ALTER TABLE "voting_guest_ballots" ADD CONSTRAINT "voting_guest_ballots_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."voting_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_guest_invites" ADD CONSTRAINT "voting_guest_invites_voting_round_id_fkey" FOREIGN KEY ("voting_round_id") REFERENCES "public"."voting_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_rounds" ADD CONSTRAINT "voting_rounds_invite_token_unique" UNIQUE("invite_token");