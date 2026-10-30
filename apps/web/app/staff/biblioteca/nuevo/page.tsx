
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Suspense } from "react";
import { NavigationLink as Link } from "@/components/feedback/navigation-link";
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
          <Link href="/staff/biblioteca" className="text-sm text-primary">
            Biblioteca
          </Link>
        }
      />
      <ModuleBody>
        {types.length === 0 ? (
          <EmptyState title="Hace falta un tipo dirigido" description={user.role === "admin" ? "Creá un tipo de clase dirigido para asociar el entrenamiento." : "Pedile al admin que cree un tipo dirigido. Los tipos Open no tienen entrenamientos."} href={user.role === "admin" ? "/staff/tipos" : undefined} action="Crear tipo dirigido" />
        ) : (
          <TrainingForm types={types} />
        )}
      </ModuleBody>
    </ModulePage>
  );
}
