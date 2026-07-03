CREATE TABLE "user_imported_songs" (
	"user_id" uuid NOT NULL,
	"imported_song_id" uuid NOT NULL,
	"favorite" boolean DEFAULT false NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_imported_songs_user_id_imported_song_id_pk" PRIMARY KEY("user_id","imported_song_id")
);
--> statement-breakpoint
ALTER TABLE "user_imported_songs" ADD CONSTRAINT "user_imported_songs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_imported_songs" ADD CONSTRAINT "user_imported_songs_imported_song_id_imported_songs_id_fk" FOREIGN KEY ("imported_song_id") REFERENCES "public"."imported_songs"("id") ON DELETE cascade ON UPDATE no action;