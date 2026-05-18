CREATE TYPE "public"."attachment_kind" AS ENUM('upload', 'link');
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "attachment_kind" NOT NULL,
	"label" text NOT NULL,
	"url" text,
	"file_name" text,
	"content_type" text,
	"byte_size" integer,
	"data_base64" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expense_artifacts" ADD COLUMN "attachment_id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
INSERT INTO "attachments" ("id", "kind", "label", "file_name", "content_type", "byte_size", "data_base64", "created_at")
SELECT "attachment_id", 'upload'::"attachment_kind", "file_name", "file_name", "content_type", "byte_size", "data_base64", "created_at"
FROM "expense_artifacts";
--> statement-breakpoint
ALTER TABLE "conversation_attachments" ADD COLUMN "attachment_id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
INSERT INTO "attachments" ("id", "kind", "label", "url", "file_name", "content_type", "byte_size", "data_base64", "created_at")
SELECT "attachment_id", "kind"::text::"attachment_kind", "label", "url", "file_name", "content_type", "byte_size", "data_base64", "created_at"
FROM "conversation_attachments";
--> statement-breakpoint
ALTER TABLE "expense_artifacts" ALTER COLUMN "attachment_id" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "conversation_attachments" ALTER COLUMN "attachment_id" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "expense_artifacts" ADD CONSTRAINT "expense_artifacts_attachment_id_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."attachments"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "conversation_attachments" ADD CONSTRAINT "conversation_attachments_attachment_id_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."attachments"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
DROP INDEX "conversation_attachments_kind_idx";
--> statement-breakpoint
ALTER TABLE "expense_artifacts" DROP COLUMN "file_name";
--> statement-breakpoint
ALTER TABLE "expense_artifacts" DROP COLUMN "content_type";
--> statement-breakpoint
ALTER TABLE "expense_artifacts" DROP COLUMN "byte_size";
--> statement-breakpoint
ALTER TABLE "expense_artifacts" DROP COLUMN "data_base64";
--> statement-breakpoint
ALTER TABLE "conversation_attachments" DROP COLUMN "kind";
--> statement-breakpoint
ALTER TABLE "conversation_attachments" DROP COLUMN "label";
--> statement-breakpoint
ALTER TABLE "conversation_attachments" DROP COLUMN "url";
--> statement-breakpoint
ALTER TABLE "conversation_attachments" DROP COLUMN "file_name";
--> statement-breakpoint
ALTER TABLE "conversation_attachments" DROP COLUMN "content_type";
--> statement-breakpoint
ALTER TABLE "conversation_attachments" DROP COLUMN "byte_size";
--> statement-breakpoint
ALTER TABLE "conversation_attachments" DROP COLUMN "data_base64";
--> statement-breakpoint
CREATE INDEX "attachments_kind_idx" ON "attachments" USING btree ("kind");
--> statement-breakpoint
CREATE INDEX "attachments_created_at_idx" ON "attachments" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "expense_artifacts_attachment_id_idx" ON "expense_artifacts" USING btree ("attachment_id");
--> statement-breakpoint
CREATE INDEX "conversation_attachments_attachment_id_idx" ON "conversation_attachments" USING btree ("attachment_id");
