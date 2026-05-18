CREATE TYPE "public"."tax_treatment" AS ENUM(
	'ordinary_expense',
	'startup_cost',
	'organizational_cost',
	'capital_asset',
	'section_179',
	'bonus_depreciation',
	'home_office_allocation',
	'mixed_use',
	'nondeductible',
	'review_needed',
	'other'
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "business_use_percentage" numeric(5, 2) DEFAULT '100' NOT NULL;
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "sales_tax_paid" numeric(12, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "tax_treatment" "tax_treatment" DEFAULT 'review_needed' NOT NULL;
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "tax_treatment_other" text DEFAULT '' NOT NULL;
