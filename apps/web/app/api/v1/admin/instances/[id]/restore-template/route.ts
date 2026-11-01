import { restoreInstanceFromTemplate } from "@/lib/box/instances";
import { BoxError } from "@/lib/box/errors";
import { staffHandler } from "@/lib/box/guard";

function requireId(params: Record<string, string>): string {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta la clase");
  return id;
}

export const POST = staffHandler(["coach", "admin"], async (user, _request, params) =>
  restoreInstanceFromTemplate(requireId(params), user.id),
);
