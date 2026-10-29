import { patchMemberSchema } from "@78feet/domain";
import { parseSchema } from "@/lib/box/parse";
import { getMember, updateMember } from "@/lib/box/members";
import { BoxError } from "@/lib/box/errors";
import { readBody, staffHandler } from "@/lib/box/guard";

function requireId(params: Record<string, string>): string {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta el socio");
  return id;
}

export const GET = staffHandler(["coach", "admin"], async (_user, _request, params) =>
  getMember(requireId(params)),
);

export const PATCH = staffHandler(["coach", "admin"], async (_user, request, params) =>
  updateMember(requireId(params), parseSchema(patchMemberSchema, await readBody(request))),
);
