ALTER TYPE "public"."invitation_status" ADD VALUE 'DECLINED';--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "invited_by" uuid;--> statement-breakpoint
UPDATE "invitations" SET "invited_by" = "families"."created_by"
FROM "families" WHERE "invitations"."family_id" = "families"."id";--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "invited_by" SET NOT NULL;