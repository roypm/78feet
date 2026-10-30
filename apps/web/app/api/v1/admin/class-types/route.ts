import { classTypeWriteSchema } from "@78feet/domain";
import { createClassType, listClassTypes } from "@/lib/box/class-types";
import { BoxError } from "@/lib/box/errors";
import { removeClassTypeImage, saveClassTypeImage } from "@/lib/box/images";
import { parseSchema } from "@/lib/box/parse";
import { staffHandler } from "@/lib/box/guard";

export const GET = staffHandler(["coach", "admin"], async () => listClassTypes());

export const POST = staffHandler(
  ["admin"],
  async (_user, request) => {
    const form = await request.formData();
    const fields = parseSchema(classTypeWriteSchema, {
      name: String(form.get("name") ?? ""),
      kind: String(form.get("kind") ?? ""),
    });
    const image = form.get("image");
    if (!(image instanceof File) || image.size === 0) {
      throw new BoxError(400, "FORBIDDEN", "La imagen es obligatoria");
    }
    const imageKey = await saveClassTypeImage(image);
    try {
      return await createClassType({ ...fields, imageKey });
    } catch (error) {
      await removeClassTypeImage(imageKey);
      throw error;
    }
  },
  201,
);
