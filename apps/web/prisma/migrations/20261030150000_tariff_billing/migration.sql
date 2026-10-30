-- Tariff: consumption + billing axes
CREATE TYPE "TariffConsumption" AS ENUM ('weekly_quota', 'pack');
CREATE TYPE "TariffBilling" AS ENUM ('monthly', 'quarterly', 'semiannual', 'annual', 'none', 'one_time');
CREATE TYPE "PaymentBilling" AS ENUM ('monthly', 'quarterly', 'semiannual', 'annual', 'one_time');

ALTER TABLE "tariff" ADD COLUMN "consumption_model" "TariffConsumption";
ALTER TABLE "tariff" ADD COLUMN "billing_period" "TariffBilling";

UPDATE "tariff" SET "consumption_model" = 'weekly_quota', "billing_period" = 'monthly' WHERE "kind" = 'monthly';
UPDATE "tariff" SET "consumption_model" = 'pack', "billing_period" = 'one_time' WHERE "kind" = 'pack';

ALTER TABLE "tariff" ALTER COLUMN "consumption_model" SET NOT NULL;
ALTER TABLE "tariff" ALTER COLUMN "billing_period" SET NOT NULL;
ALTER TABLE "tariff" DROP COLUMN "kind";

ALTER TABLE "payment" ADD COLUMN "billing_period" "PaymentBilling";
ALTER TABLE "payment" RENAME COLUMN "month" TO "period_start";

UPDATE "payment" SET "billing_period" = 'monthly' WHERE "kind" = 'monthly';
UPDATE "payment" SET "billing_period" = 'one_time' WHERE "kind" = 'pack';

ALTER TABLE "payment" ALTER COLUMN "billing_period" SET NOT NULL;
ALTER TABLE "payment" DROP COLUMN "kind";

DROP INDEX IF EXISTS "payment_one_month";
CREATE UNIQUE INDEX "payment_one_period"
  ON "payment"("user_id", "billing_period", "period_start")
  WHERE "billing_period" <> 'one_time';

DROP TYPE "TariffKind";
DROP TYPE "PaymentKind";
