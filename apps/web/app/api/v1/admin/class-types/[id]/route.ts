import { classTypePatchSchema } from "@78feet/domain";
import { deleteClassType, updateClassType } from "@/lib/box/class-types";
import { BoxError } from "@/lib/box/errors";
import { removeClassTypeImage, saveClassTypeImage } from "@/lib/box/images";
import { parseSchema } from "@/lib/box/parse";
import { staffHandler } from "@/lib/box/guard";

function requireId(params: Record<string, string>): string {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta el tipo");
  return id;
}

export const PATCH = staffHandler(["admin"], async (_user, request, params) => {
  const id = requireId(params);
  const form = await request.formData();
  const name = form.get("name");
  const image = form.get("image");
  const imageKey =
    image instanceof File && image.size > 0 ? await saveClassTypeImage(image) : undefined;
  const patch =
    typeof name === "string" && name.trim().length > 0
      ? parseSchema(classTypePatchSchema, { name })
      : {};
  if (!patch.name && !imageKey) throw new BoxError(400, "FORBIDDEN", "Nada para actualizar");
  try {
    return await updateClassType(id, { ...patch, imageKey });
  } catch (error) {
    if (imageKey) await removeClassTypeImage(imageKey);
    throw error;
  }
});

export const DELETE = staffHandler(["admin"], async (_user, _request, params) =>
  deleteClassType(requireId(params)),
);
