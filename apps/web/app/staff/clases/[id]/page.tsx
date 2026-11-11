
import { ClassTypeThumb } from "@/components/class-types/class-type-thumb";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { instanceHasStarted } from "@78feet/domain";
import { requireStaff } from "@/lib/auth/current";
import { getStaffInstance } from "@/lib/box/staff-calendar";
import { listMembers } from "@/lib/box/members";
import { parseStaffClassOrigin, staffClassOriginBack } from "@/lib/box/staff-nav";
import { StaffCrumbs } from "@/components/common/navigation/staff-crumbs";
import { listClassTypes } from "@/lib/box/class-types";
import { listTrainings } from "@/lib/box/trainings";
import { listCoaches } from "@/lib/box/staff-users";
import { BoxError } from "@/lib/box/errors";
import { formatDay, formatTime, freeSpotLabel, kindLabel } from "@/lib/box/format";
import { InstanceDetailActions } from "@/components/classes/instance-detail-actions";
import { ClassRosterPanel } from "@/components/classes/class-roster-panel";
import { Badge } from "@/components/ui/badge";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { ProfileAvatar } from "@/components/common/media/profile-avatar";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ desde?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Clase" />
          <ModuleBody>
            <LoadingState variant="class" label="Cargando la clase…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <ClassDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ClassDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ desde?: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  let instance;
  try {
    instance = await getStaffInstance(id);
  } catch (error) {
    if (error instanceof BoxError && error.status === 404) notFound();
    throw error;
  }
  const [classTypes, trainings, coaches, activeMembers] = await Promise.all([
    listClassTypes(),
    listTrainings(instance.classTypeId),
    listCoaches(),
    listMembers("active"),
  ]);
  const compatible = trainings.filter((training) => training.classTypeId === instance.classTypeId);
  const query = await searchParams;
  const now = new Date();
  const startAt = new Date(instance.startAt);
  const back = staffClassOriginBack(parseStaffClassOrigin(query.desde), instance.date, now, instance.boxId);
  const canAddMember = instance.status === "scheduled" && !instanceHasStarted(now, startAt);
  const canRemoveMember = instance.status === "scheduled" && instance.roster.length > 0;

  return (
    <ModulePage>
      <ModuleHeader
        eyebrow={<StaffCrumbs items={[{ href: back.href, label: back.label }, { label: instance.name }]} />}
        title={instance.name}
        description={`${instance.boxName} · ${formatDay(instance.date)} · ${formatTime(new Date(instance.startAt))}–${formatTime(new Date(instance.endAt))}`}
        action={
          <InstanceDetailActions
            instance={instance}
            classTypes={classTypes}
            trainings={compatible}
            coaches={coaches}
            returnHref={back.href}
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
                    <ClassTypeThumb imageUrl={instance.imageUrl} className="size-16 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1">
            {instance.coachName ? (
              <div className="flex min-w-0 items-center gap-2">
                <ProfileAvatar name={instance.coachName} imageUrl={instance.coachProfileImageUrl} size="sm" />
                <p className="min-w-0 truncate text-sm">
                  Coach · <span className="font-medium">{instance.coachName}</span>
                </p>
              </div>
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
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Apuntados</h2>
          <ClassRosterPanel
            instanceId={instance.id}
            instanceLabel={`${instance.name} · ${formatTime(startAt)}`}
            canAddMember={canAddMember}
            canRemoveMember={canRemoveMember}
            instanceStatus={instance.status}
            members={activeMembers.map((member) => ({
              id: member.id,
              name: `${member.firstName} ${member.lastName}`,
            }))}
            roster={instance.roster}
          />
        </section>
      </ModuleBody>
    </ModulePage>
  );
}
