CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"bio" text,
	"location" text,
	"availability" text DEFAULT 'available' NOT NULL,
	"functions" text[] DEFAULT '{}' NOT NULL,
	"instruments" text[] DEFAULT '{}' NOT NULL,
	"competencies" text[] DEFAULT '{}' NOT NULL,
	"rider" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;