import { patchStaffSchema } from "@78feet/domain";
import { patchStaff } from "@/lib/box/staff-users";
import { BoxError } from "@/lib/box/errors";
import { parseSchema } from "@/lib/box/parse";
import { readBody, staffHandler } from "@/lib/box/guard";

export const PATCH = staffHandler(["admin"], async (_user, request, params) => {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta la cuenta");
  return patchStaff(id, parseSchema(patchStaffSchema, await readBody(request)));
});
