import { createStaffSchema } from "@78feet/domain";
import { createStaff, listStaff } from "@/lib/box/staff-users";
import { parseSchema } from "@/lib/box/parse";
import { readBody, staffHandler } from "@/lib/box/guard";

export const GET = staffHandler(["admin"], async () => listStaff());

export const POST = staffHandler(
  ["admin"],
  async (_user, request) => createStaff(parseSchema(createStaffSchema, await readBody(request))),
  201,
);
