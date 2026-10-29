import { getMemberSummary } from "@/lib/box/summary";
import { sessionHandler } from "@/lib/box/guard";

export const GET = sessionHandler(["member"], async (user) => getMemberSummary(user.id));
