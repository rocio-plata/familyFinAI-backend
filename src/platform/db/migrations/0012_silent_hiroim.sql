CREATE TABLE "ai_usage" (
	"user_id" uuid NOT NULL,
	"day" varchar(10) NOT NULL,
	"used" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_usage_user_day_key" ON "ai_usage" USING btree ("user_id","day");