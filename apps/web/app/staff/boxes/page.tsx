import { BoxesPanel } from "@/components/boxes/boxes-panel";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { listBoxes } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Sedes" />
    <ModuleBody width="full">
      <LoadingState variant="table" label="Cargando las sedes…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const { account, query } = useAccountQuery(["boxes", "admin"], () => listBoxes());
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/staff/hoy">
      {(boxes) => (
        <ModulePage>
          <ModuleHeader title="Sedes" description="Creá sedes y cambiá su nombre. Cada una nace con plantilla vacía y horario 07:00–21:00; el detalle se configura en Plantilla y Horario del box." />
          <ModuleBody width="full" inset="content">
            <BoxesPanel boxes={boxes} />
          </ModuleBody>
        </ModulePage>
      )}
    </QueryBody>
  );
}
