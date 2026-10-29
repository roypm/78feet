import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current";
import { listClassTypes } from "@/lib/box/class-types";
import { ClassTypesPanel } from "@/components/staff/class-types-panel";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Tipos de clase" />
          <ModuleBody>
            <p className="text-muted-foreground">Cargando los tipos de clase…</p>
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
      <ModuleHeader title="Tipos de clase">
        <p className="text-sm text-muted-foreground">Catálogo de imágenes y grillas que usa el horario del box.</p>
      </ModuleHeader>
      <ModuleBody>
        <ClassTypesPanel types={types} />
      </ModuleBody>
    </ModulePage>
  );
}
