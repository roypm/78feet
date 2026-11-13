export type MemberSummary = {
  tariff: {
    name: string;
    consumptionModel: import("@78feet/domain").TariffConsumption;
    billingPeriod: import("@78feet/domain").TariffBilling;
    priceCents: number;
    quotaDirected: number | null;
    quotaOpen: number | null;
  } | null;
  quota: {
    period: import("@78feet/domain").QuotaPeriod | null;
    periodStart: string | null;
    periodEnd: string | null;
    periodLabel: string | null;
    directedUsed: number;
    directedLimit: number | null;
    directedAdjustment: number;
    openUsed: number;
    openLimit: number | null;
    openAdjustment: number;
    packBalance: number;
  };
  payment: {
    status: "paid" | "pending";
    billingPeriod: "monthly" | "quarterly" | "semiannual" | "annual";
    periodStart: string;
    periodLabel: string;
  } | null;
};

export type OwnProfile = {
  firstName: string;
  lastName: string;
  loginId: string;
  dni: string | null;
  phone: string | null;
  email: string | null;
  profileImageUrl: string | null;
};
