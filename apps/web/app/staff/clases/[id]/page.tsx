import { useParams, useSearchParams } from "react-router";
import { instanceHasStarted } from "@78feet/domain";
import { Badge } from "@/components/ui/badge";
import { ClassTypeThumb } from "@/components/class-types/class-type-thumb";
import { ClassRosterPanel } from "@/components/classes/class-roster-panel";
import { InstanceDetailActions } from "@/components/classes/instance-detail-actions";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { ProfileAvatar } from "@/components/common/media/profile-avatar";
import { StaffCrumbs } from "@/components/common/navigation/staff-crumbs";
import { formatDay, formatTime, freeSpotLabel, kindLabel } from "@/lib/box/format";
import { parseStaffClassOrigin, staffClassOriginBack } from "@/lib/box/staff-nav";
import { getStaffInstance, listClassTypes, listCoaches, listMemberOptions, listTrainings } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Clase" />
    <ModuleBody>
      <LoadingState variant="class" label="Cargando la clase…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const desde = params.get("desde") ?? undefined;
  const { account, query } = useAccountQuery(["instance", "staff", id, desde ?? ""], async () => {
    const instance = await getStaffInstance(id);
    const [classTypes, trainings, coaches, activeMembers] = await Promise.all([
      listClassTypes(),
      listTrainings(instance.classTypeId),
      listCoaches(),
      listMemberOptions(),
    ]);
    return { instance, classTypes, trainings, coaches, activeMembers };
  });
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/staff/hoy" missing="staff">
      {({ instance, classTypes, trainings, coaches, activeMembers }) => {
        const now = new Date();
        const startAt = new Date(instance.startAt);
        const back = staffClassOriginBack(parseStaffClassOrigin(desde), instance.date, now, instance.boxSlug);
        const compatible = trainings.filter((training) => training.classTypeId === instance.classTypeId);
        return (
          <ModulePage>
            <ModuleHeader
              eyebrow={<StaffCrumbs items={[{ href: back.href, label: back.label }, { label: instance.name }]} />}
              title={instance.name}
              description={`${instance.boxName} · ${formatDay(instance.date)} · ${formatTime(new Date(instance.startAt))}–${formatTime(new Date(instance.endAt))}`}
              action={<InstanceDetailActions instance={instance} classTypes={classTypes} trainings={compatible} coaches={coaches} returnHref={back.href} />}
              toolbar={
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={instance.kind === "directed" ? "default" : "secondary"}>{kindLabel(instance.kind)}</Badge>
                  <span className="text-sm tabular-nums text-muted-foreground">{instance.bookedCount}/{instance.capacity} · {freeSpotLabel(instance.freeSpots)}</span>
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
                      <p className="min-w-0 truncate text-sm">Coach · <span className="font-medium">{instance.coachName}</span></p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin coach asignado</p>
                  )}
                  {instance.trainingName ? <p className="mt-1 text-sm">Entrenamiento · <span className="font-medium">{instance.trainingName}</span></p> : null}
                  {instance.status === "cancelled" ? <p className="mt-1 text-sm text-destructive">Cancelada{instance.cancelReason ? ` · ${instance.cancelReason}` : ""}</p> : null}
                </div>
              </section>
              <section className="flex flex-col gap-3">
                <h2 className="text-sm font-medium">Apuntados</h2>
                <ClassRosterPanel
                  instanceId={instance.id}
                  instanceLabel={`${instance.name} · ${formatTime(startAt)}`}
                  canAddMember={instance.status === "scheduled" && !instanceHasStarted(now, startAt)}
                  canRemoveMember={instance.status === "scheduled" && instance.roster.length > 0}
                  instanceStatus={instance.status}
                  members={activeMembers.map((member) => ({ id: member.id, name: `${member.firstName} ${member.lastName}` }))}
                  roster={instance.roster}
                />
              </section>
            </ModuleBody>
          </ModulePage>
        );
      }}
    </QueryBody>
  );
}
