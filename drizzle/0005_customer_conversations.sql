CREATE TYPE "public"."conversation_attachment_kind" AS ENUM('upload', 'link');
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description_markdown" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"title" text NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"body_markdown" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_message_people" (
	"message_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	CONSTRAINT "conversation_message_people_message_id_person_id_pk" PRIMARY KEY("message_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "conversation_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"kind" "conversation_attachment_kind" NOT NULL,
	"label" text NOT NULL,
	"url" text,
	"file_name" text,
	"content_type" text,
	"byte_size" integer,
	"data_base64" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "conversation_people" ADD CONSTRAINT "conversation_people_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "conversation_message_people" ADD CONSTRAINT "conversation_message_people_message_id_conversation_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."conversation_messages"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "conversation_message_people" ADD CONSTRAINT "conversation_message_people_person_id_conversation_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."conversation_people"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "conversation_attachments" ADD CONSTRAINT "conversation_attachments_message_id_conversation_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."conversation_messages"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "customers_user_id_idx" ON "customers" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("name");
--> statement-breakpoint
CREATE INDEX "conversation_people_user_id_idx" ON "conversation_people" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "conversation_people_name_idx" ON "conversation_people" USING btree ("name");
--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_people_user_normalized_name_idx" ON "conversation_people" USING btree ("user_id","normalized_name");
--> statement-breakpoint
CREATE INDEX "conversation_messages_customer_id_idx" ON "conversation_messages" USING btree ("customer_id");
--> statement-breakpoint
CREATE INDEX "conversation_messages_created_at_idx" ON "conversation_messages" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "conversation_messages_updated_at_idx" ON "conversation_messages" USING btree ("updated_at");
--> statement-breakpoint
CREATE INDEX "conversation_message_people_person_id_idx" ON "conversation_message_people" USING btree ("person_id");
--> statement-breakpoint
CREATE INDEX "conversation_attachments_message_id_idx" ON "conversation_attachments" USING btree ("message_id");
--> statement-breakpoint
CREATE INDEX "conversation_attachments_kind_idx" ON "conversation_attachments" USING btree ("kind");
