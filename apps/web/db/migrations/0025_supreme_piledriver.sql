CREATE TABLE "song_previews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"normalized_key" text NOT NULL,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"preview_url" text,
	"deezer_track_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "song_previews_normalized_key_unique" UNIQUE("normalized_key")
);
