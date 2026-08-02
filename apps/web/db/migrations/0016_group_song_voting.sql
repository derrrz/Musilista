CREATE TABLE "voting_ballots" (
	"candidate_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voting_ballots_pkey" PRIMARY KEY("candidate_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "voting_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voting_round_id" uuid NOT NULL,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"added_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voting_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"title" text NOT NULL,
	"max_votes_per_member" integer DEFAULT 3 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"result_repertoire_id" uuid
);
--> statement-breakpoint
ALTER TABLE "voting_ballots" ADD CONSTRAINT "voting_ballots_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."voting_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_ballots" ADD CONSTRAINT "voting_ballots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_candidates" ADD CONSTRAINT "voting_candidates_voting_round_id_fkey" FOREIGN KEY ("voting_round_id") REFERENCES "public"."voting_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_candidates" ADD CONSTRAINT "voting_candidates_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_rounds" ADD CONSTRAINT "voting_rounds_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_rounds" ADD CONSTRAINT "voting_rounds_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_rounds" ADD CONSTRAINT "voting_rounds_result_repertoire_id_fkey" FOREIGN KEY ("result_repertoire_id") REFERENCES "public"."repertoires"("id") ON DELETE set null ON UPDATE no action;