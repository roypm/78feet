CREATE TYPE "UserTheme" AS ENUM ('light', 'dark');

ALTER TABLE "user" ADD COLUMN "theme" "UserTheme" NOT NULL DEFAULT 'light';
