
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Suspense } from "react";
import { StaffCrumbs } from "@/components/staff/staff-crumbs";
import { requireStaff } from "@/lib/auth/current";
import { listClassTypes } from "@/lib/box/class-types";
import { TrainingForm } from "@/components/staff/training-form";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Nuevo entrenamiento" />
          <ModuleBody>
            <LoadingState variant="form" label="Cargando el editor de entrenamientos…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <NewTraining />
    </Suspense>
  );
}

async function NewTraining() {
  const user = await requireStaff();
  const types = (await listClassTypes()).filter((type) => type.kind === "directed");

  return (
    <ModulePage>
      <ModuleHeader
        title="Nuevo entrenamiento"
        description="Fases y bloques de texto para un tipo dirigido."
        eyebrow={
          <StaffCrumbs
            items={[
              { href: "/staff/biblioteca", label: "Biblioteca" },
              { label: "Nuevo entrenamiento" },
            ]}
          />
        }
      />
      {types.length === 0 ? (
        <ModuleBody>
          <EmptyState title="Hace falta un tipo dirigido" description={user.role === "admin" ? "Creá un tipo de clase dirigido para asociar el entrenamiento." : "Pedile al admin que cree un tipo dirigido. Los tipos Open no tienen entrenamientos."} href={user.role === "admin" ? "/staff/tipos" : undefined} action="Crear tipo dirigido" />
        </ModuleBody>
      ) : (
        <ModuleBody fill>
          <TrainingForm types={types} />
        </ModuleBody>
      )}
    </ModulePage>
  );
}
