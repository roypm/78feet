import { createPaymentSchema } from "@78feet/domain";
import { recordPayment } from "@/lib/box/unpaid";
import { parseSchema } from "@/lib/box/parse";
import { readBody, staffHandler } from "@/lib/box/guard";

export const POST = staffHandler(
  ["coach", "admin"],
  async (user, request) => recordPayment(parseSchema(createPaymentSchema, await readBody(request)), user.id),
  201,
);
