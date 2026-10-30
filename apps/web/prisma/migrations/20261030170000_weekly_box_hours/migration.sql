ALTER TABLE "box_settings"
ADD COLUMN "weekly_hours" JSONB,
ADD COLUMN "exceptions" JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE "box_settings" AS settings
SET "weekly_hours" = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'weekday', weekday,
      'intervals', jsonb_build_array(
        jsonb_build_object(
          'openTime', to_char(settings."open_time", 'HH24:MI'),
          'closeTime', to_char(settings."close_time", 'HH24:MI')
        )
      )
    )
    ORDER BY weekday
  )
  FROM generate_series(1, 7) AS days(weekday)
);

ALTER TABLE "box_settings"
ALTER COLUMN "weekly_hours" SET NOT NULL,
DROP COLUMN "open_time",
DROP COLUMN "close_time";
