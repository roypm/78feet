import type { TariffBilling, TariffConsumption } from "./types";

export type SubscriptionBilling = Exclude<TariffBilling, "none" | "one_time">;

const SUBSCRIPTION_BILLING: readonly SubscriptionBilling[] = [
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
];

export function isSubscriptionBilling(billing: TariffBilling): billing is SubscriptionBilling {
  return (SUBSCRIPTION_BILLING as readonly string[]).includes(billing);
}

export function periodStartForDate(isoDate: string, billing: SubscriptionBilling): string {
  const [year, month] = isoDate.split("-").map(Number);
  if (billing === "monthly") {
    return `${isoDate.slice(0, 7)}-01`;
  }
  if (billing === "annual") {
    return `${year}-01-01`;
  }
  if (billing === "semiannual") {
    return month <= 6 ? `${year}-01-01` : `${year}-07-01`;
  }
  // quarterly
  if (month <= 3) return `${year}-01-01`;
  if (month <= 6) return `${year}-04-01`;
  if (month <= 9) return `${year}-07-01`;
  return `${year}-10-01`;
}

export function billingPeriodKindLabel(billing: TariffBilling): string {
  switch (billing) {
    case "monthly":
      return "Mensual";
    case "quarterly":
      return "Trimestral";
    case "semiannual":
      return "Semestral";
    case "annual":
      return "Anual";
    case "none":
      return "Sin cobro";
    case "one_time":
      return "Pago único";
  }
}

export function usesPeriodicQuota(consumption: TariffConsumption): boolean {
  return consumption === "weekly_quota" || consumption === "monthly_quota";
}

export function consumptionModelLabel(consumption: TariffConsumption): string {
  switch (consumption) {
    case "weekly_quota":
      return "Cupo semanal";
    case "monthly_quota":
      return "Cupo mensual";
    case "pack":
      return "Bono";
  }
}

/** Etiqueta corta del periodo de cobro en curso (es-ES, Madrid). */
export function subscriptionPeriodLabel(billing: SubscriptionBilling, periodStart: string): string {
  const start = periodStartForDate(periodStart, billing);
  const [year, month, day] = start.split("-").map(Number);
  const monthNames = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  const m = monthNames[month - 1] ?? "";
  switch (billing) {
    case "monthly":
      return `${monthNames[month - 1]} ${year}`;
    case "annual":
      return `Año ${year}`;
    case "semiannual":
      return month <= 6 ? `Semestre ene–jun ${year}` : `Semestre jul–dic ${year}`;
    case "quarterly": {
      if (month === 1) return `Trimestre ene–mar ${year}`;
      if (month === 4) return `Trimestre abr–jun ${year}`;
      if (month === 7) return `Trimestre jul–sep ${year}`;
      return `Trimestre oct–dic ${year}`;
    }
    default:
      return `${day}/${month}/${year}`;
  }
}
