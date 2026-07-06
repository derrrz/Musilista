CREATE TABLE "page_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path" text NOT NULL,
	"visitor" text NOT NULL,
	"referrer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_views_daily" (
	"day" date NOT NULL,
	"path" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "page_views_daily_pk" PRIMARY KEY("day","path")
);
--> statement-breakpoint
CREATE INDEX "page_events_created_at_idx" ON "page_events" USING btree ("created_at");