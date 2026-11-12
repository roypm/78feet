CREATE TYPE "public"."AuthRealm" AS ENUM('member', 'staff');--> statement-breakpoint
CREATE TYPE "public"."BookingPool" AS ENUM('quota_directed', 'quota_open', 'pack');--> statement-breakpoint
CREATE TYPE "public"."BookingStatus" AS ENUM('active', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."ClassKind" AS ENUM('directed', 'open');--> statement-breakpoint
CREATE TYPE "public"."EndedReason" AS ENUM('change', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."InstanceStatus" AS ENUM('scheduled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."PaymentBilling" AS ENUM('monthly', 'quarterly', 'semiannual', 'annual', 'one_time');--> statement-breakpoint
CREATE TYPE "public"."QuotaPeriod" AS ENUM('week', 'month');--> statement-breakpoint
CREATE TYPE "public"."Role" AS ENUM('member', 'coach', 'admin');--> statement-breakpoint
CREATE TYPE "public"."TariffBilling" AS ENUM('monthly', 'quarterly', 'semiannual', 'annual', 'none', 'one_time');--> statement-breakpoint
CREATE TYPE "public"."TariffConsumption" AS ENUM('weekly_quota', 'pack', 'monthly_quota');--> statement-breakpoint
CREATE TYPE "public"."UserStatus" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."UserTheme" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TABLE "booking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"pool" "BookingPool" NOT NULL,
	"status" "BookingStatus" NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" uuid,
	"quota_returned" boolean
);
--> statement-breakpoint
CREATE TABLE "box" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"weekly_hours" jsonb NOT NULL,
	"exceptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"slug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_instance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid,
	"date" date NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"kind" "ClassKind" NOT NULL,
	"coach_id" uuid,
	"capacity" integer NOT NULL,
	"status" "InstanceStatus" NOT NULL,
	"edited_at" timestamp with time zone,
	"cancel_reason" text,
	"class_type_id" uuid NOT NULL,
	"training_id" uuid,
	"box_id" uuid NOT NULL,
	CONSTRAINT "class_instance_time_order" CHECK (end_at > start_at)
);
--> statement-breakpoint
CREATE TABLE "class_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"coach_id" uuid,
	"default_capacity" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"class_type_id" uuid NOT NULL,
	"box_id" uuid NOT NULL,
	CONSTRAINT "class_template_weekday_iso" CHECK ((weekday >= 1) AND (weekday <= 7)),
	CONSTRAINT "class_template_time_order" CHECK (end_time > start_time)
);
--> statement-breakpoint
CREATE TABLE "class_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" "ClassKind" NOT NULL,
	"image_key" text,
	"slug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_type_image" (
	"id" text PRIMARY KEY NOT NULL,
	"mime_type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_grant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"payment_id" uuid,
	"note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "credit_grant_quantity_nonzero" CHECK (quantity <> 0)
);
--> statement-breakpoint
CREATE TABLE "membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tariff_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"ended_reason" "EndedReason"
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period_start" date,
	"amount_cents" integer NOT NULL,
	"method" text,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"billing_period" "PaymentBilling" NOT NULL,
	"payment_box_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quota_adjustment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"kind" "ClassKind" NOT NULL,
	"delta" integer NOT NULL,
	"note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"period" "QuotaPeriod" DEFAULT 'week' NOT NULL,
	CONSTRAINT "quota_adjustment_delta_nonzero" CHECK (delta <> 0)
);
--> statement-breakpoint
CREATE TABLE "tariff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"price_cents" integer NOT NULL,
	"quota_directed" integer DEFAULT 0,
	"quota_open" integer DEFAULT 0,
	"pack_classes" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"consumption_model" "TariffConsumption" NOT NULL,
	"billing_period" "TariffBilling" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"class_type_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_block" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"body" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_phase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"auth_realm" "AuthRealm" NOT NULL,
	"auth_user_id" text NOT NULL,
	"member_auth_id" text GENERATED ALWAYS AS (CASE WHEN auth_realm = 'member' THEN auth_user_id END) STORED,
	"staff_auth_id" text GENERATED ALWAYS AS (CASE WHEN auth_realm = 'staff' THEN auth_user_id END) STORED,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "Role" NOT NULL,
	"status" "UserStatus" NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"dni" text,
	"phone" text,
	"failed_logins" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"theme" "UserTheme" DEFAULT 'system' NOT NULL,
	"payment_box_id" uuid,
	"preference_box_id" uuid,
	CONSTRAINT "user_auth_role" CHECK ((auth_realm = 'member' AND role = 'member') OR (auth_realm = 'staff' AND role IN ('coach', 'admin')))
);
--> statement-breakpoint
CREATE TABLE "user_profile_image" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"mime_type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_auth_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	CONSTRAINT "member_auth_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "member_auth_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"username" text NOT NULL,
	"display_username" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "member_auth_user_email_unique" UNIQUE("email"),
	CONSTRAINT "member_auth_user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "member_auth_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_auth_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	CONSTRAINT "staff_auth_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "staff_auth_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"username" text NOT NULL,
	"display_username" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "staff_auth_user_email_unique" UNIQUE("email"),
	CONSTRAINT "staff_auth_user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "staff_auth_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."class_instance"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "class_instance" ADD CONSTRAINT "class_instance_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."class_template"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "class_instance" ADD CONSTRAINT "class_instance_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "class_instance" ADD CONSTRAINT "class_instance_class_type_id_fkey" FOREIGN KEY ("class_type_id") REFERENCES "public"."class_type"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "class_instance" ADD CONSTRAINT "class_instance_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "public"."training"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "class_instance" ADD CONSTRAINT "class_instance_box_id_fkey" FOREIGN KEY ("box_id") REFERENCES "public"."box"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "class_template" ADD CONSTRAINT "class_template_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "class_template" ADD CONSTRAINT "class_template_class_type_id_fkey" FOREIGN KEY ("class_type_id") REFERENCES "public"."class_type"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "class_template" ADD CONSTRAINT "class_template_box_id_fkey" FOREIGN KEY ("box_id") REFERENCES "public"."box"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "credit_grant" ADD CONSTRAINT "credit_grant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "credit_grant" ADD CONSTRAINT "credit_grant_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "credit_grant" ADD CONSTRAINT "credit_grant_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_tariff_id_fkey" FOREIGN KEY ("tariff_id") REFERENCES "public"."tariff"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_payment_box_id_fkey" FOREIGN KEY ("payment_box_id") REFERENCES "public"."box"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "quota_adjustment" ADD CONSTRAINT "quota_adjustment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "quota_adjustment" ADD CONSTRAINT "quota_adjustment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "training" ADD CONSTRAINT "training_class_type_id_fkey" FOREIGN KEY ("class_type_id") REFERENCES "public"."class_type"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "training_block" ADD CONSTRAINT "training_block_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "public"."training_phase"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "training_phase" ADD CONSTRAINT "training_phase_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "public"."training"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_member_auth_id_member_auth_user_id_fk" FOREIGN KEY ("member_auth_id") REFERENCES "public"."member_auth_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_staff_auth_id_staff_auth_user_id_fk" FOREIGN KEY ("staff_auth_id") REFERENCES "public"."staff_auth_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_payment_box_id_fkey" FOREIGN KEY ("payment_box_id") REFERENCES "public"."box"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_preference_box_id_fkey" FOREIGN KEY ("preference_box_id") REFERENCES "public"."box"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_profile_image" ADD CONSTRAINT "user_profile_image_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "member_auth_account" ADD CONSTRAINT "member_auth_account_user_id_member_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."member_auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_auth_session" ADD CONSTRAINT "member_auth_session_user_id_member_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."member_auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_auth_account" ADD CONSTRAINT "staff_auth_account_user_id_staff_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."staff_auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_auth_session" ADD CONSTRAINT "staff_auth_session_user_id_staff_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."staff_auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_instance_id_idx" ON "booking" USING btree ("instance_id");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_one_active" ON "booking" USING btree ("instance_id","user_id") WHERE (status = 'active'::"BookingStatus");--> statement-breakpoint
CREATE INDEX "booking_user_id_idx" ON "booking" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "box_name_key" ON "box" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "box_slug_key" ON "box" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "class_instance_box_id_idx" ON "class_instance" USING btree ("box_id");--> statement-breakpoint
CREATE INDEX "class_instance_date_idx" ON "class_instance" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "class_instance_template_date" ON "class_instance" USING btree ("template_id","date") WHERE (template_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "class_template_box_id_idx" ON "class_template" USING btree ("box_id");--> statement-breakpoint
CREATE UNIQUE INDEX "class_type_slug_key" ON "class_type" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "credit_grant_user_id_idx" ON "credit_grant" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_one_current" ON "membership" USING btree ("user_id") WHERE (ended_at IS NULL);--> statement-breakpoint
CREATE INDEX "membership_user_id_idx" ON "membership" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_one_period" ON "payment" USING btree ("user_id","billing_period","period_start") WHERE (billing_period <> 'one_time'::"PaymentBilling");--> statement-breakpoint
CREATE INDEX "payment_payment_box_id_created_at_idx" ON "payment" USING btree ("payment_box_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "payment_user_id_month_idx" ON "payment" USING btree ("user_id","period_start");--> statement-breakpoint
CREATE INDEX "quota_adjustment_user_id_period_period_start_idx" ON "quota_adjustment" USING btree ("user_id","period","period_start");--> statement-breakpoint
CREATE INDEX "training_class_type_id_idx" ON "training" USING btree ("class_type_id");--> statement-breakpoint
CREATE INDEX "training_block_phase_id_idx" ON "training_block" USING btree ("phase_id");--> statement-breakpoint
CREATE INDEX "training_phase_training_id_idx" ON "training_phase" USING btree ("training_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_auth_identity" ON "user" USING btree ("auth_realm","auth_user_id");--> statement-breakpoint
CREATE INDEX "user_payment_box_id_idx" ON "user" USING btree ("payment_box_id");--> statement-breakpoint
CREATE INDEX "member_account_user_idx" ON "member_auth_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "member_session_user_idx" ON "member_auth_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "staff_account_user_idx" ON "staff_auth_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "staff_session_user_idx" ON "staff_auth_session" USING btree ("user_id");