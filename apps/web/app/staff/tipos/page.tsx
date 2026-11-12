import { LoadingState } from "@/components/common/feedback/loading-state";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current";
import { listClassTypes } from "@/lib/box/class-types";
import { ClassTypesPanel } from "@/components/class-types/class-types-panel";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Tipos de clase" />
          <ModuleBody width="full">
            <LoadingState variant="table" label="Cargando los tipos de clase…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <ClassTypes />
    </Suspense>
  );
}

async function ClassTypes() {
  await requireAdmin();
  const types = await listClassTypes();

  return (
    <ModulePage>
      <ModuleHeader
        title="Tipos de clase"
        description="Catálogo de imágenes y grillas que usa el horario del box."
      />
      <ModuleBody width="full" inset="content">
        <ClassTypesPanel types={types} />
      </ModuleBody>
    </ModulePage>
  );
}
