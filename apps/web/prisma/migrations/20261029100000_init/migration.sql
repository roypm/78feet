-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('member', 'coach', 'admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "TariffKind" AS ENUM ('monthly', 'pack');

-- CreateEnum
CREATE TYPE "ClassKind" AS ENUM ('directed', 'open');

-- CreateEnum
CREATE TYPE "InstanceStatus" AS ENUM ('scheduled', 'cancelled');

-- CreateEnum
CREATE TYPE "BookingPool" AS ENUM ('weekly_directed', 'weekly_open', 'pack');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('active', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('monthly', 'pack');

-- CreateEnum
CREATE TYPE "EndedReason" AS ENUM ('change', 'cancelled');

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "login_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "dni" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "failed_logins" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ,
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "TariffKind" NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "weekly_directed" INTEGER NOT NULL DEFAULT 0,
    "weekly_open" INTEGER NOT NULL DEFAULT 0,
    "pack_classes" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tariff_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL,
    "ended_at" TIMESTAMPTZ,
    "ended_reason" "EndedReason",

    CONSTRAINT "membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_grant" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "payment_id" UUID,
    "note" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_grant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "credit_grant_quantity_positive" CHECK ("quantity" > 0)
);

-- CreateTable
CREATE TABLE "payment" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "month" DATE,
    "amount_cents" INTEGER NOT NULL,
    "method" TEXT,
    "recorded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_template" (
    "id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "ClassKind" NOT NULL,
    "coach_id" UUID,
    "default_capacity" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "class_template_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "class_template_weekday_iso" CHECK ("weekday" BETWEEN 1 AND 7),
    CONSTRAINT "class_template_time_order" CHECK ("end_time" > "start_time")
);

-- CreateTable
CREATE TABLE "class_instance" (
    "id" UUID NOT NULL,
    "template_id" UUID,
    "date" DATE NOT NULL,
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "ClassKind" NOT NULL,
    "coach_id" UUID,
    "capacity" INTEGER NOT NULL,
    "status" "InstanceStatus" NOT NULL,
    "edited_at" TIMESTAMPTZ,
    "cancel_reason" TEXT,

    CONSTRAINT "class_instance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "class_instance_time_order" CHECK ("end_at" > "start_at")
);

-- CreateTable
CREATE TABLE "booking" (
    "id" UUID NOT NULL,
    "instance_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "pool" "BookingPool" NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMPTZ,
    "cancelled_by" UUID,
    "quota_returned" BOOLEAN,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_login_id_key" ON "user"("login_id");
CREATE INDEX "membership_user_id_idx" ON "membership"("user_id");
CREATE INDEX "credit_grant_user_id_idx" ON "credit_grant"("user_id");
CREATE INDEX "payment_user_id_month_idx" ON "payment"("user_id", "month");
CREATE INDEX "class_instance_date_idx" ON "class_instance"("date");
CREATE INDEX "booking_user_id_idx" ON "booking"("user_id");
CREATE INDEX "booking_instance_id_idx" ON "booking"("instance_id");

-- TRD: at most one current membership per user
CREATE UNIQUE INDEX "membership_one_current" ON "membership"("user_id") WHERE "ended_at" IS NULL;

-- TRD: one monthly payment per user and calendar month
CREATE UNIQUE INDEX "payment_one_month" ON "payment"("user_id", "month") WHERE "kind" = 'monthly';

-- TRD: one instance per template and local date
CREATE UNIQUE INDEX "class_instance_template_date" ON "class_instance"("template_id", "date") WHERE "template_id" IS NOT NULL;

-- TRD: nobody books the same class twice while the booking is active
CREATE UNIQUE INDEX "booking_one_active" ON "booking"("instance_id", "user_id") WHERE "status" = 'active';

ALTER TABLE "membership" ADD CONSTRAINT "membership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "membership" ADD CONSTRAINT "membership_tariff_id_fkey" FOREIGN KEY ("tariff_id") REFERENCES "tariff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "credit_grant" ADD CONSTRAINT "credit_grant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "credit_grant" ADD CONSTRAINT "credit_grant_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "credit_grant" ADD CONSTRAINT "credit_grant_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment" ADD CONSTRAINT "payment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment" ADD CONSTRAINT "payment_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_template" ADD CONSTRAINT "class_template_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "class_instance" ADD CONSTRAINT "class_instance_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "class_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "class_instance" ADD CONSTRAINT "class_instance_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "booking" ADD CONSTRAINT "booking_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "class_instance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking" ADD CONSTRAINT "booking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking" ADD CONSTRAINT "booking_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking" ADD CONSTRAINT "booking_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
