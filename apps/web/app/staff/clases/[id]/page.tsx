import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/current";
import { getStaffInstance } from "@/lib/box/staff-calendar";
import { listClassTypes } from "@/lib/box/class-types";
import { listTrainings } from "@/lib/box/trainings";
import { listCoaches } from "@/lib/box/staff-users";
import { BoxError } from "@/lib/box/errors";
import { formatDay, formatTime } from "@/lib/box/format";
import { InstanceForm } from "@/components/staff/instance-form";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Clase" />
          <ModuleBody>
            <p className="text-muted-foreground">Cargando la clase…</p>
          </ModuleBody>
        </ModulePage>
      }
    >
      <ClassDetail params={params} />
    </Suspense>
  );
}

async function ClassDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  let instance;
  try {
    instance = await getStaffInstance(id);
  } catch (error) {
    if (error instanceof BoxError && error.status === 404) notFound();
    throw error;
  }
  const [classTypes, trainings, coaches] = await Promise.all([
    listClassTypes(),
    listTrainings(instance.classTypeId),
    listCoaches(),
  ]);
  const compatible = trainings.filter((training) => training.classTypeId === instance.classTypeId);

  return (
    <ModulePage>
      <ModuleHeader
        title={instance.name}
        eyebrow={
          <Link href="/staff/excepciones" className="text-sm text-primary">
            Excepciones
          </Link>
        }
      >
        <p className="text-muted-foreground tabular-nums">
          {formatDay(instance.date)} · {formatTime(new Date(instance.startAt))}–{formatTime(new Date(instance.endAt))}
        </p>
      </ModuleHeader>
      <ModuleBody>
        {instance.roster.length > 0 ? (
          <section className="flex flex-col gap-2 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
            <h2 className="text-sm font-medium">Roster</h2>
            <ul className="flex flex-col gap-1 text-sm">
              {instance.roster.map((person) => (
                <li key={person.bookingId}>
                  <Link href={`/staff/socios/${person.userId}`} className="text-primary">
                    {person.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">Nadie apuntado</p>
        )}
        <InstanceForm
          instance={instance}
          classTypes={classTypes}
          trainings={compatible}
          coaches={coaches}
        />
      </ModuleBody>
    </ModulePage>
  );
}
