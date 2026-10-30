import { LoadingState } from "@/components/feedback/loading-state";
import { Suspense } from "react";
import { NavigationLink as Link } from "@/components/feedback/navigation-link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/current";
import { listClassTypes } from "@/lib/box/class-types";
import { getTraining } from "@/lib/box/trainings";
import { BoxError } from "@/lib/box/errors";
import { TrainingForm } from "@/components/staff/training-form";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Editar entrenamiento" />
          <ModuleBody>
            <LoadingState variant="form" label="Cargando el entrenamiento…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <TrainingEdit params={params} />
    </Suspense>
  );
}

async function TrainingEdit({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  let training;
  try {
    training = await getTraining(id, { includeAssignmentInfo: true });
  } catch (error) {
    if (error instanceof BoxError && error.status === 404) notFound();
    throw error;
  }
  const types = (await listClassTypes()).filter((type) => type.kind === "directed");

  return (
    <ModulePage>
      <ModuleHeader
        title={`Editar · ${training.name}`}
        description={training.classType.name}
        eyebrow={
          <Link href={`/staff/biblioteca/${training.id}`} className="text-sm text-primary">
            Volver al entrenamiento
          </Link>
        }
      />
      <ModuleBody>
        <TrainingForm
          types={types}
          training={{
            id: training.id,
            name: training.name,
            classTypeId: training.classTypeId,
            phases: training.phases.map((phase) => ({
              name: phase.name,
              blocks: phase.blocks.map((block) => ({ body: block.body })),
            })),
            hasAssignedClasses: training.hasAssignedClasses,
          }}
        />
      </ModuleBody>
    </ModulePage>
  );
}
