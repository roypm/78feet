import { patchPaymentSchema } from "@78feet/domain";
import { BoxError } from "@/lib/box/errors";
import { deletePayment, patchPayment } from "@/lib/box/payments";
import { parseSchema } from "@/lib/box/parse";
import { readBody, staffHandler } from "@/lib/box/guard";

export const PATCH = staffHandler(["coach", "admin"], async (_user, request, params) => {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta el pago");
  return patchPayment(id, parseSchema(patchPaymentSchema, await readBody(request)));
});

export const DELETE = staffHandler(["coach", "admin"], async (_user, _request, params) => {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta el pago");
  await deletePayment(id);
  return { ok: true };
});
