export const staffActivityPaths = ["/staff/hoy", "/staff/semana", "/staff/excepciones"];

export function isNavigationActive(pathname: string, href: string, classOrigin = "/staff/semana"): boolean {
  if (pathname.startsWith("/staff/clases/")) return href === classOrigin;
  if (href === "/calendario" && pathname.startsWith("/clases/")) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}
