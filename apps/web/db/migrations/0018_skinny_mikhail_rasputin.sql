ALTER TABLE "repertoire_songs" ADD COLUMN "genero" text;--> statement-breakpoint
ALTER TABLE "repertoire_songs" ADD COLUMN "estilos" text[] DEFAULT '{}' NOT NULL;