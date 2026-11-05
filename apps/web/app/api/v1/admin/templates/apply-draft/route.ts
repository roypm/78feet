import { applyTemplateDraftSchema } from "@78feet/domain";
import { applyTemplateDraft } from "@/lib/box/templates";
import { BoxError } from "@/lib/box/errors";
import { readBody, staffHandler } from "@/lib/box/guard";
import { parseSchema } from "@/lib/box/parse";

export const POST = staffHandler(["admin"], async (user, request) => {
  const body = parseSchema(applyTemplateDraftSchema, await readBody(request));
  if (body.updated.some((slot) => slot.id.startsWith("pending:"))) {
    throw new BoxError(400, "FORBIDDEN", "Hay huecos nuevos sin guardar en el borrador");
  }
  return applyTemplateDraft(body, user.id);
});
