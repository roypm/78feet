import type { TariffBilling, TariffConsumption } from "@78feet/domain";

export type TariffView = {
  id: string;
  name: string;
  consumptionModel: TariffConsumption;
  billingPeriod: TariffBilling;
  priceCents: number;
  quotaDirected: number | null;
  quotaOpen: number | null;
  packClasses: number | null;
  active: boolean;
  createdAt: string;
};
