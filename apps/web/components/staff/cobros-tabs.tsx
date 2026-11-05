import { FilterTabLink, FilterTabs } from "@/components/member/kind-tabs";

export function CobrosNavTabs({ active }: { active: "pending" | "registered" }) {
  return (
    <FilterTabs aria-label="Cobros">
      <FilterTabLink href="/staff/impagos" active={active === "pending"}>
        Pendientes
      </FilterTabLink>
      <FilterTabLink href="/staff/cobros" active={active === "registered"}>
        Registrados
      </FilterTabLink>
    </FilterTabs>
  );
}

/** Enlace de listado de cobros con filtro opcional por box de pago (sin paginación). */
export function paymentBoxListHref(path: string, paymentBoxId?: string) {
  return paymentBoxId ? `${path}?box=${encodeURIComponent(paymentBoxId)}` : path;
}
