import { patchInstanceSchema } from "@78feet/domain";
import { getStaffInstance } from "@/lib/box/staff-calendar";
import { patchInstance } from "@/lib/box/instances";
import { BoxError } from "@/lib/box/errors";
import { parseSchema } from "@/lib/box/parse";
import { readBody, staffHandler } from "@/lib/box/guard";

function requireId(params: Record<string, string>): string {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta la clase");
  return id;
}

export const GET = staffHandler(["coach", "admin"], async (_user, _request, params) =>
  getStaffInstance(requireId(params)),
);

export const PATCH = staffHandler(["coach", "admin"], async (user, request, params) =>
  patchInstance(requireId(params), parseSchema(patchInstanceSchema, await readBody(request)), user.id),
);
