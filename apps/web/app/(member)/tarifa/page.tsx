import { Suspense } from "react";
import { requireMember } from "@/lib/auth/current";
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
          <ModuleHeader title="Mi tarifa" />
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
      <ModuleHeader title="Mi tarifa" />
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
            <Badge variant="secondary" className="w-fit">
              {tariff.kind === "monthly" ? "Mensual" : "Bono"}
            </Badge>
            {tariff.kind === "monthly" ? (
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
              <p className="flex items-center gap-2">
                <span>Este mes</span>
                <Badge
                  className={
                    summary.payment === "paid"
                      ? "bg-success text-white"
                      : "bg-warning text-primary-foreground"
                  }
                >
                  {summary.payment === "paid" ? "Pagado" : "Pendiente"}
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
