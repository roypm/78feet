import { LoadingState } from "@/components/common/feedback/loading-state";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current";
import { listBoxes } from "@/lib/box/boxes";
import { BoxesPanel } from "@/components/boxes/boxes-panel";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Sedes" />
          <ModuleBody width="full">
            <LoadingState variant="table" label="Cargando las sedes…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <Boxes />
    </Suspense>
  );
}

async function Boxes() {
  await requireAdmin();
  const boxes = await listBoxes();

  return (
    <ModulePage>
      <ModuleHeader
        title="Sedes"
        description="Creá sedes y cambiá su nombre. Cada una nace con plantilla vacía y horario 07:00–21:00; el detalle se configura en Plantilla y Horario del box."
      />
      <ModuleBody width="full" inset="content">
        <BoxesPanel boxes={boxes} />
      </ModuleBody>
    </ModulePage>
  );
}
