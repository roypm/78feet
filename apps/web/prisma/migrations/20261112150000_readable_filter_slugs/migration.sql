ALTER TABLE "box" ADD COLUMN "slug" TEXT;
ALTER TABLE "class_type" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "box_slug_key" ON "box"("slug");
CREATE UNIQUE INDEX "class_type_slug_key" ON "class_type"("slug");

-- Populate stable names once, resolving accents, duplicate names and reserved filter values.
DO $$
DECLARE
  table_name TEXT;
  item RECORD;
  base TEXT;
  candidate TEXT;
  suffix INTEGER;
  occupied BOOLEAN;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['box', 'class_type'] LOOP
    FOR item IN EXECUTE format('SELECT id, name FROM %I ORDER BY id', table_name) LOOP
      base := trim(both '-' from regexp_replace(lower(translate(item.name,
        'áàâäãåéèêëíìîïóòôöõúùûüñçÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÇ',
        'aaaaaaeeeeiiiiooooouuuuncAAAAAAEEEEIIIIOOOOOUUUUNC')), '[^a-z0-9]+', '-', 'g'));
      base := rtrim(left(base, 80), '-');
      IF base = '' THEN base := 'item'; END IF;
      suffix := CASE WHEN base = 'todos' THEN 2 ELSE 1 END;
      LOOP
        candidate := base || CASE WHEN suffix = 1 THEN '' ELSE '-' || suffix END;
        EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE slug = $1)', table_name)
          INTO occupied USING candidate;
        EXIT WHEN NOT occupied;
        suffix := suffix + 1;
      END LOOP;
      EXECUTE format('UPDATE %I SET slug = $1 WHERE id = $2', table_name) USING candidate, item.id;
    END LOOP;
  END LOOP;
END $$;
ALTER TABLE "box" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "class_type" ALTER COLUMN "slug" SET NOT NULL;
