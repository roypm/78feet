import { TrainingForm } from "@/components/trainings/training-form";
import { EmptyState } from "@/components/common/feedback/empty-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { StaffCrumbs } from "@/components/common/navigation/staff-crumbs";
import { listClassTypes } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Nuevo entrenamiento" />
    <ModuleBody>
      <LoadingState variant="form" label="Cargando el editor de entrenamientos…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const { account, query } = useAccountQuery(["types", "directed-new"], async () =>
    (await listClassTypes()).filter((type) => type.kind === "directed"),
  );
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/staff/hoy">
      {(types) => (
        <ModulePage>
          <ModuleHeader
            title="Nuevo entrenamiento"
            description="Fases y bloques de texto para un tipo dirigido."
            eyebrow={<StaffCrumbs items={[{ href: "/staff/biblioteca", label: "Biblioteca" }, { label: "Nuevo entrenamiento" }]} />}
          />
          {types.length === 0 ? (
            <ModuleBody>
              <EmptyState
                title="Hace falta un tipo dirigido"
                description={account?.role === "admin" ? "Creá un tipo de clase dirigido para asociar el entrenamiento." : "Pedile al admin que cree un tipo dirigido. Los tipos Open no tienen entrenamientos."}
                href={account?.role === "admin" ? "/staff/tipos" : undefined}
                action="Crear tipo dirigido"
              />
            </ModuleBody>
          ) : (
            <ModuleBody fill>
              <TrainingForm types={types} />
            </ModuleBody>
          )}
        </ModulePage>
      )}
    </QueryBody>
  );
}
