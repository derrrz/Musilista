ALTER TABLE "artist_photos" ALTER COLUMN "image_data" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "song_covers" ALTER COLUMN "image_data" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "artist_photos" ADD COLUMN "blob_url" text;--> statement-breakpoint
ALTER TABLE "song_covers" ADD COLUMN "blob_url" text;