/** Enlace de listado de cobros con filtro opcional por box de pago (sin paginación). */
export function paymentBoxListHref(path: string, paymentBoxSlug?: string) {
  return paymentBoxSlug ? `${path}?box=${encodeURIComponent(paymentBoxSlug)}` : path;
}
