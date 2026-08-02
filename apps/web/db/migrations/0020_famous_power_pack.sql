ALTER TABLE "group_references" ALTER COLUMN "url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "group_references" ADD COLUMN "artist" text;--> statement-breakpoint
ALTER TABLE "group_references" ADD COLUMN "imported_song_id" uuid;--> statement-breakpoint
ALTER TABLE "group_references" ADD CONSTRAINT "group_references_imported_song_id_fkey" FOREIGN KEY ("imported_song_id") REFERENCES "public"."imported_songs"("id") ON DELETE set null ON UPDATE no action;