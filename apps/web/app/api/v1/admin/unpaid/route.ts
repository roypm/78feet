import { pageNumber } from "@/lib/box/pagination";
import { unpaidQuerySchema } from "@78feet/domain";
import { listUnpaidPage } from "@/lib/box/unpaid";
import { parseSchema } from "@/lib/box/parse";
import { staffHandler } from "@/lib/box/guard";

export const GET = staffHandler(["coach", "admin"], async (_user, request) => {
  const date = new URL(request.url).searchParams.get("date") ?? undefined;
  const query = parseSchema(unpaidQuerySchema, date ? { date } : {});
  const page = new URL(request.url).searchParams.get("page");
  return listUnpaidPage(query.date, pageNumber(page ?? undefined));
});
