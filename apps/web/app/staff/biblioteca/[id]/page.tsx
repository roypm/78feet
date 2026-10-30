import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/current";
import { getTraining } from "@/lib/box/trainings";
import { listClassTypes } from "@/lib/box/class-types";
import { BoxError } from "@/lib/box/errors";
import { TrainingForm } from "@/components/staff/training-form";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Biblioteca" />
          <ModuleBody>
            <p className="text-muted-foreground">Cargando el entrenamiento…</p>
          </ModuleBody>
        </ModulePage>
      }
    >
      <TrainingDetail params={params} />
    </Suspense>
  );
}

async function TrainingDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  let training;
  try {
    training = await getTraining(id);
  } catch (error) {
    if (error instanceof BoxError && error.status === 404) notFound();
    throw error;
  }
  const types = (await listClassTypes()).filter((type) => type.kind === "directed");

  return (
    <ModulePage>
      <ModuleHeader
        title={training.name}
        description={training.classType.name}
        eyebrow={
          <Link href="/staff/biblioteca" className="text-sm text-primary">
            Biblioteca
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
          }}
        />
      </ModuleBody>
    </ModulePage>
  );
}
