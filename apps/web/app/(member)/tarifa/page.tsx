import { billingPeriodKindLabel, consumptionModelLabel, formatQuotaUsedLimit, usesPeriodicQuota } from "@78feet/domain";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { formatPrice } from "@/lib/box/format";
import { getMemberSummary } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Mi tarifa" description="Tu tarifa activa, cupo disponible y saldo de bono." />
    <ModuleBody width="full">
      <LoadingState variant="profile" label="Cargando tu tarifa…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const { account, query } = useAccountQuery(["summary", "me"], (account) =>
    getMemberSummary(account.id, account.role),
  );
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/calendario">
      {(summary) => {
        const tariff = summary.tariff;
        return (
          <ModulePage>
            <ModuleHeader title="Mi tarifa" description="Tu tarifa activa, cupo disponible y saldo de bono." />
            <ModuleBody width="full">
              {!tariff ? (
                <ListEmptyBlock title="Sin membresía activa" description="Hablá con el staff del box para que te asigne una tarifa. Tu cuenta no permite cambiarla directamente." />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="min-w-0 wrap-break-word">{tariff.name}</CardTitle>
                    <CardDescription className="tabular-nums">{formatPrice(tariff.priceCents)}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="w-fit">{consumptionModelLabel(tariff.consumptionModel)}</Badge>
                      <Badge variant="outline" className="w-fit">{billingPeriodKindLabel(tariff.billingPeriod)}</Badge>
                    </div>
                    {usesPeriodicQuota(tariff.consumptionModel) ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {summary.quota.period === "month" ? "Este mes" : "Esta semana"}
                          {summary.quota.periodLabel ? ` · ${summary.quota.periodLabel}` : ""}
                        </p>
                        <p className="tabular-nums">Dirigidas {formatQuotaUsedLimit(summary.quota.directedUsed, summary.quota.directedLimit, summary.quota.directedAdjustment)}</p>
                        <p className="tabular-nums">Opens {formatQuotaUsedLimit(summary.quota.openUsed, summary.quota.openLimit, summary.quota.openAdjustment)}</p>
                      </>
                    ) : null}
                    <p className="tabular-nums">Saldo de bono {summary.quota.packBalance}</p>
                    {summary.payment ? (
                      <p className="flex flex-wrap items-center gap-2">
                        <span>{summary.payment.periodLabel}</span>
                        <Badge className={summary.payment.status === "paid" ? "bg-success text-white" : "bg-warning text-primary-foreground"}>
                          {summary.payment.status === "paid" ? "Pagado" : "Pendiente"}
                        </Badge>
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              )}
            </ModuleBody>
          </ModulePage>
        );
      }}
    </QueryBody>
  );
}
