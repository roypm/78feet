import { patchStaffSchema } from "@78feet/domain";
import { getStaff, patchStaff } from "@/lib/box/staff-users";
import { BoxError } from "@/lib/box/errors";
import { parseSchema } from "@/lib/box/parse";
import { readBody, staffHandler } from "@/lib/box/guard";

export const GET = staffHandler(["admin"], async (_user, _request, params) => {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta la cuenta");
  return getStaff(id);
});

export const PATCH = staffHandler(["admin"], async (_user, request, params) => {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta la cuenta");
  return patchStaff(id, parseSchema(patchStaffSchema, await readBody(request)));
});
