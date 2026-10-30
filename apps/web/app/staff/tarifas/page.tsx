import { LoadingState } from "@/components/feedback/loading-state";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current";
import { listTariffs } from "@/lib/box/tariffs";
import { TariffsPanel } from "@/components/staff/tariffs-panel";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Tarifas" />
          <ModuleBody width="full" inset="content">
            <LoadingState variant="table" label="Cargando tarifas…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <Tariffs />
    </Suspense>
  );
}

async function Tariffs() {
  await requireAdmin();
  const tariffs = await listTariffs();

  return (
    <ModulePage>
      <ModuleHeader title="Tarifas" description="Cupos semanales y precios que se asignan a los socios." />
      <ModuleBody width="full" inset="content">
        <TariffsPanel tariffs={tariffs} />
      </ModuleBody>
    </ModulePage>
  );
}
