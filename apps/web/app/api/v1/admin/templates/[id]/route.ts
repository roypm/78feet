import { patchTemplateSchema } from "@78feet/domain";
import { parseSchema } from "@/lib/box/parse";
import { deleteTemplate, updateTemplate } from "@/lib/box/templates";
import { BoxError } from "@/lib/box/errors";
import { readBody, staffHandler } from "@/lib/box/guard";

function requireId(params: Record<string, string>): string {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta la plantilla");
  return id;
}

export const PATCH = staffHandler(["admin"], async (user, request, params) =>
  updateTemplate(requireId(params), parseSchema(patchTemplateSchema, await readBody(request)), user.id),
);

export const DELETE = staffHandler(["admin"], async (user, _request, params) =>
  deleteTemplate(requireId(params), user.id),
);
