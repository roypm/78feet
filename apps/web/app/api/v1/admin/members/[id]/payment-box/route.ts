import { paymentBoxSchema } from "@78feet/domain";
import { setPaymentBox } from "@/lib/box/boxes";
import { BoxError } from "@/lib/box/errors";
import { parseSchema } from "@/lib/box/parse";
import { readBody, staffHandler } from "@/lib/box/guard";

export const POST = staffHandler(["coach", "admin"], async (_user, request, params) => {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta el socio");
  const body = parseSchema(paymentBoxSchema, await readBody(request));
  return setPaymentBox(id, body.paymentBoxId);
});
