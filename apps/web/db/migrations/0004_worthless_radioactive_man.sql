CREATE TABLE "song_covers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"normalized_key" text NOT NULL,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"image_data" text NOT NULL,
	"content_type" text NOT NULL,
	"width" integer,
	"height" integer,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "song_covers_normalized_key_unique" UNIQUE("normalized_key")
);
