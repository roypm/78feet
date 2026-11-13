import { useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookButton } from "@/components/bookings/book-button";
import { CancelBookingButton } from "@/components/bookings/cancel-button";
import { EmptyState } from "@/components/common/feedback/empty-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { NavigationLink as Link } from "@/components/common/navigation/navigation-link";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { ProfileAvatar } from "@/components/common/media/profile-avatar";
import { ResourceImage } from "@/components/common/media/resource-image";
import { TrainingRead } from "@/components/trainings/training-read";
import { formatDay, formatTime, freeSpotLabel, kindLabel } from "@/lib/box/format";
import { getInstanceDetail } from "@/lib/server/queries";
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
  const { account, query } = useAccountQuery(["instance", id], () => getInstanceDetail(id));
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/calendario" missing="member">
      {(detail) => (
        <ModulePage>
          <ModuleHeader
            title={detail.name}
            eyebrow={<Link href="/calendario" className="text-sm text-primary">Calendario</Link>}
            action={<Badge variant={detail.kind === "directed" ? "default" : "secondary"} className="shrink-0">{kindLabel(detail.kind)}</Badge>}
            description={`${detail.boxName} · ${formatDay(detail.date)} · ${formatTime(new Date(detail.startAt))}–${formatTime(new Date(detail.endAt))}`}
            toolbar={<p className="text-sm tabular-nums text-muted-foreground">{detail.bookedCount}/{detail.capacity} · {freeSpotLabel(detail.freeSpots)}</p>}
          />
          <ModuleBody>
            {detail.coachName ? (
              <div className="flex min-w-0 items-center gap-3">
                <ProfileAvatar name={detail.coachName} imageUrl={detail.coachProfileImageUrl} />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Coach</p>
                  <p className="truncate font-medium">{detail.coachName}</p>
                </div>
              </div>
            ) : null}
            {detail.imageUrl ? <ResourceImage src={detail.imageUrl} alt="" className="h-40 w-full rounded-md object-cover" /> : null}
            <section className="flex flex-col gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
              <h2 className="text-sm font-medium">Roster</h2>
              {detail.roster.length === 0 ? (
                <EmptyState compact title="Todavía no hay nadie apuntado" description="Las reservas de esta clase aparecerán acá." />
              ) : (
                <ul className="flex flex-col gap-2">
                  {detail.roster.map((person) => (
                    <li key={person.userId} className="flex min-w-0 items-center gap-3">
                      <ProfileAvatar name={person.name} imageUrl={person.profileImageUrl} size="sm" />
                      <span className="min-w-0 truncate">{person.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {detail.training ? (
              <section className="flex flex-col gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
                <Link href={`/biblioteca/${detail.training.id}`} className="font-medium text-primary">{detail.training.name}</Link>
                <TrainingRead name={detail.training.name} phases={detail.training.phases} />
              </section>
            ) : null}
            <ClassAction detail={detail} />
          </ModuleBody>
        </ModulePage>
      )}
    </QueryBody>
  );
}

function ClassAction({
  detail,
}: {
  detail: {
    status: "scheduled" | "cancelled";
    canBook: boolean;
    canCancel: boolean;
    bookedByMe: boolean;
    bookingId: string | null;
    freeSpots: number;
    id: string;
  };
}) {
  if (detail.status === "cancelled") return <p className="text-sm text-muted-foreground">Clase cancelada</p>;
  if (detail.bookedByMe && detail.bookingId) {
    if (detail.canCancel) return <CancelBookingButton bookingId={detail.bookingId} nextHref="/reservas" />;
    return (
      <div className="flex flex-col gap-2">
        <Button type="button" variant="outline" className="min-h-11 w-full" disabled>Cancelación cerrada</Button>
        <p className="text-sm text-muted-foreground">La cancelación se cierra dos horas antes del inicio de la clase.</p>
      </div>
    );
  }
  if (detail.canBook) return <BookButton instanceId={detail.id} />;
  if (detail.freeSpots <= 0) return <Button type="button" className="min-h-11 w-full" disabled>Clase completa</Button>;
  return <p className="text-sm text-muted-foreground">La clase ya empezó</p>;
}
