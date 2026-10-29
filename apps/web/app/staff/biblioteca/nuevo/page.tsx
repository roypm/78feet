import { Suspense } from "react";
import Link from "next/link";
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
            <p className="text-muted-foreground">Cargando…</p>
          </ModuleBody>
        </ModulePage>
      }
    >
      <NewTraining />
    </Suspense>
  );
}

async function NewTraining() {
  await requireStaff();
  const types = (await listClassTypes()).filter((type) => type.kind === "directed");

  return (
    <ModulePage>
      <ModuleHeader
        title="Nuevo entrenamiento"
        eyebrow={
          <Link href="/staff/biblioteca" className="text-sm text-primary">
            Biblioteca
          </Link>
        }
      />
      <ModuleBody>
        {types.length === 0 ? (
          <p className="text-muted-foreground">Primero el admin tiene que crear un tipo dirigido.</p>
        ) : (
          <TrainingForm types={types} />
        )}
      </ModuleBody>
    </ModulePage>
  );
}
