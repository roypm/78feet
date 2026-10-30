import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/current";
import { getTraining } from "@/lib/box/trainings";
import { BoxError } from "@/lib/box/errors";
import { TrainingRead } from "@/components/box/training-read";
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
  await requireMember();
  const { id } = await params;
  let training;
  try {
    training = await getTraining(id);
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
          <Link href="/biblioteca" className="text-sm text-primary">
            Biblioteca
          </Link>
        }
      />
      <ModuleBody>
        <TrainingRead
          name={training.name}
          classTypeName={training.classType.name}
          phases={training.phases}
        />
      </ModuleBody>
    </ModulePage>
  );
}
