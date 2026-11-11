/** Enlace de listado de cobros con filtro opcional por box de pago (sin paginación). */
export function paymentBoxListHref(path: string, paymentBoxId?: string) {
  return paymentBoxId ? `${path}?box=${encodeURIComponent(paymentBoxId)}` : path;
}
