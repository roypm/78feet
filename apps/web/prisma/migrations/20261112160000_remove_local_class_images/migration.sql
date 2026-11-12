-- Development uploads from the removed local storage are disposable.
UPDATE class_type SET image_key = NULL
WHERE image_key IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM class_type_image WHERE id = class_type.image_key);
