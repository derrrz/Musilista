CREATE TABLE "ai_usage_monthly" (
	"month" text PRIMARY KEY NOT NULL,
	"estimated_cost_micros" integer DEFAULT 0 NOT NULL,
	"call_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
