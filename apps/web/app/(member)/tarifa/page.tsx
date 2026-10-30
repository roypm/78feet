import { Suspense } from "react";
import { requireMember } from "@/lib/auth/current";
import { billingPeriodKindLabel, consumptionModelLabel, usesPeriodicQuota } from "@78feet/domain";
import { formatPrice } from "@/lib/box/format";
import { getMemberSummary } from "@/lib/box/summary";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Mi tarifa" description="Tu tarifa activa, cupo semanal y saldo de bono." />
          <ModuleBody>
            <p className="text-muted-foreground">Cargando tu tarifa…</p>
          </ModuleBody>
        </ModulePage>
      }
    >
      <Tariff />
    </Suspense>
  );
}

async function Tariff() {
  const user = await requireMember();
  const summary = await getMemberSummary(user.id);
  const tariff = summary.tariff;

  return (
    <ModulePage>
      <ModuleHeader title="Mi tarifa" description="Tu tarifa activa, cupo semanal y saldo de bono." />
      <ModuleBody>
      {!tariff ? (
        <p className="text-muted-foreground">Sin membresía activa</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="min-w-0 wrap-break-word">{tariff.name}</CardTitle>
            <CardDescription className="tabular-nums">{formatPrice(tariff.priceCents)}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="w-fit">
                {consumptionModelLabel(tariff.consumptionModel)}
              </Badge>
              <Badge variant="outline" className="w-fit">
                {billingPeriodKindLabel(tariff.billingPeriod)}
              </Badge>
            </div>
            {usesPeriodicQuota(tariff.consumptionModel) ? (
              <>
                <p className="tabular-nums">
                  Dirigidas {summary.quota.directedUsed}/{summary.quota.directedLimit}
                </p>
                <p className="tabular-nums">
                  Opens {summary.quota.openUsed}/{summary.quota.openLimit}
                </p>
              </>
            ) : null}
            <p className="tabular-nums">Saldo de bono {summary.quota.packBalance}</p>
            {summary.payment ? (
              <p className="flex flex-wrap items-center gap-2">
                <span>{summary.payment.periodLabel}</span>
                <Badge
                  className={
                    summary.payment.status === "paid"
                      ? "bg-success text-white"
                      : "bg-warning text-primary-foreground"
                  }
                >
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
}
