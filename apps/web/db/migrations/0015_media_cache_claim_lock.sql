ALTER TABLE "artist_photos" ALTER COLUMN "content_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "song_covers" ALTER COLUMN "content_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "artist_photos" ADD COLUMN "claimed_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "song_covers" ADD COLUMN "claimed_at" timestamp with time zone DEFAULT now() NOT NULL;