ALTER TABLE "imported_songs" ADD COLUMN "artist_slug" text;--> statement-breakpoint
ALTER TABLE "imported_songs" ADD COLUMN "title_slug" text;--> statement-breakpoint
ALTER TABLE "imported_songs" ADD COLUMN "version_label" text;--> statement-breakpoint
ALTER TABLE "imported_songs" ADD COLUMN "version_slug" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX "imported_songs_artist_slug_idx" ON "imported_songs" USING btree ("artist_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "imported_songs_group_version_unique" ON "imported_songs" USING btree ("artist_slug","title_slug","version_slug") WHERE artist_slug is not null;