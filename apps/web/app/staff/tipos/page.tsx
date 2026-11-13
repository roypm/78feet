import { ClassTypesPanel } from "@/components/class-types/class-types-panel";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { listClassTypes } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Tipos de clase" />
    <ModuleBody width="full">
      <LoadingState variant="table" label="Cargando los tipos de clase…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const { account, query } = useAccountQuery(["types"], () => listClassTypes());
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/staff/hoy">
      {(types) => (
        <ModulePage>
          <ModuleHeader title="Tipos de clase" description="Catálogo de imágenes y grillas que usa el horario del box." />
          <ModuleBody width="full" inset="content">
            <ClassTypesPanel types={types} />
          </ModuleBody>
        </ModulePage>
      )}
    </QueryBody>
  );
}
