import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { localDateString } from "@78feet/domain";
import { requireStaff } from "@/lib/auth/current";
import { getStaffInstance } from "@/lib/box/staff-calendar";
import { listClassTypes } from "@/lib/box/class-types";
import { listTrainings } from "@/lib/box/trainings";
import { listCoaches } from "@/lib/box/staff-users";
import { BoxError } from "@/lib/box/errors";
import { formatDay, formatTime, freeSpotLabel, kindLabel } from "@/lib/box/format";
import { InstanceDetailActions } from "@/components/staff/instance-form";
import { Badge } from "@/components/ui/badge";
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
  const today = localDateString(new Date());
  const backHref = instance.date === today ? "/staff/hoy" : "/staff/excepciones";
  const backLabel = instance.date === today ? "Hoy" : "Excepciones";

  return (
    <ModulePage>
      <ModuleHeader
        eyebrow={
          <Link href={backHref} className="text-sm text-primary">
            {backLabel}
          </Link>
        }
        title={instance.name}
        description={`${formatDay(instance.date)} · ${formatTime(new Date(instance.startAt))}–${formatTime(new Date(instance.endAt))}`}
        action={
          <InstanceDetailActions
            instance={instance}
            classTypes={classTypes}
            trainings={compatible}
            coaches={coaches}
          />
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={instance.kind === "directed" ? "default" : "secondary"}>{kindLabel(instance.kind)}</Badge>
            <span className="text-sm tabular-nums text-muted-foreground">
              {instance.bookedCount}/{instance.capacity} · {freeSpotLabel(instance.freeSpots)}
            </span>
          </div>
        }
      />
      <ModuleBody>
        <section className="flex items-start gap-4 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={instance.imageUrl} alt="" className="size-16 shrink-0 rounded-md object-cover" />
          <div className="min-w-0 flex-1">
            {instance.coachName ? (
              <p className="text-sm">
                Coach · <span className="font-medium">{instance.coachName}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Sin coach asignado</p>
            )}
            {instance.trainingName ? (
              <p className="mt-1 text-sm">
                Entrenamiento · <span className="font-medium">{instance.trainingName}</span>
              </p>
            ) : null}
            {instance.status === "cancelled" ? (
              <p className="mt-1 text-sm text-destructive">
                Cancelada{instance.cancelReason ? ` · ${instance.cancelReason}` : ""}
              </p>
            ) : null}
          </div>
        </section>
        {instance.roster.length > 0 ? (
          <section className="flex flex-col gap-2 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
            <h2 className="text-sm font-medium">Roster</h2>
            <ul className="flex flex-col gap-1 text-sm">
              {instance.roster.map((person) => (
                <li key={person.bookingId}>
                  <Link href={`/staff/socios/${person.userId}`} className="text-primary">
                    {person.name}
                  </Link>
                  {person.phone ? <span className="text-muted-foreground"> · {person.phone}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </ModuleBody>
    </ModulePage>
  );
}
