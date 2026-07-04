CREATE TABLE "artist_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"normalized_name" text NOT NULL,
	"artist_name" text NOT NULL,
	"image_data" text NOT NULL,
	"content_type" text NOT NULL,
	"width" integer,
	"height" integer,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artist_photos_normalized_name_unique" UNIQUE("normalized_name")
);
