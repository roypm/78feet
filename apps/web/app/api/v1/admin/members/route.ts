import { createMemberSchema, memberListQuerySchema } from "@78feet/domain";
import { parseSchema } from "@/lib/box/parse";
import { createMember, listMembers } from "@/lib/box/members";
import { readBody, staffHandler } from "@/lib/box/guard";

export const GET = staffHandler(["coach", "admin"], async (_user, request) => {
  const status = new URL(request.url).searchParams.get("status");
  const query = parseSchema(memberListQuerySchema, status ? { status } : {});
  return listMembers(query.status);
});

export const POST = staffHandler(
  ["coach", "admin"],
  async (_user, request) => createMember(parseSchema(createMemberSchema, await readBody(request))),
  201,
);
