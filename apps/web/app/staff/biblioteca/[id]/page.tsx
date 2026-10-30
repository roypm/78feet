import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/current";
import { getTraining } from "@/lib/box/trainings";
import { BoxError } from "@/lib/box/errors";
import { TrainingRead } from "@/components/box/training-read";
import { TrainingDeleteButton } from "@/components/staff/training-delete-button";
import { Button } from "@/components/ui/button";
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
    training = await getTraining(id, { includeAssignmentInfo: true });
  } catch (error) {
    if (error instanceof BoxError && error.status === 404) notFound();
    throw error;
  }
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
        <div className="flex flex-wrap items-center gap-2">
          <Button nativeButton={false} variant="outline" className="min-h-11" render={<Link href={`/staff/biblioteca/${training.id}/editar`} />}>
            Editar
          </Button>
          <TrainingDeleteButton trainingId={training.id} />
        </div>
        <p className="text-sm text-muted-foreground">
          Se asigna desde la ficha de cada clase. Los cambios de nombre y contenido se reflejan en las clases vinculadas, también en las pasadas; al cambiar el tipo, las clases incompatibles pierden el plan.
        </p>
        <TrainingRead
          name={training.name}
          classTypeName={training.classType.name}
          phases={training.phases}
          showHeading={false}
        />
      </ModuleBody>
    </ModulePage>
  );
}
