import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/current";
import { getInstanceDetail } from "@/lib/box/calendar";
import { BoxError } from "@/lib/box/errors";
import { formatDay, formatTime, freeSpotLabel, kindLabel } from "@/lib/box/format";
import { BookButton } from "@/components/member/book-button";
import { CancelBookingButton } from "@/components/member/cancel-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireMember();
  const { id } = await params;
  let detail;
  try {
    detail = await getInstanceDetail(user.id, id);
  } catch (error) {
    if (error instanceof BoxError && error.status === 404) notFound();
    throw error;
  }

  return (
    <ModulePage>
      <ModuleHeader
        title={detail.title}
        eyebrow={
          <Link href="/calendario" className="text-sm text-primary">
            Calendario
          </Link>
        }
        action={
          <Badge variant={detail.kind === "directed" ? "default" : "secondary"} className="shrink-0">
            {kindLabel(detail.kind)}
          </Badge>
        }
      >
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground tabular-nums">
            {formatDay(detail.date)} · {formatTime(new Date(detail.startAt))}–{formatTime(new Date(detail.endAt))}
          </p>
          {detail.coachName ? <p className="min-w-0 wrap-break-word">{detail.coachName}</p> : null}
          <p className="tabular-nums">
            {detail.bookedCount}/{detail.capacity}
            <span className="text-muted-foreground"> · {freeSpotLabel(detail.freeSpots)}</span>
          </p>
        </div>
      </ModuleHeader>
      <ModuleBody>
        <section className="flex flex-col gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="text-sm font-medium">Roster</h2>
          {detail.roster.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nadie apuntado</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {detail.roster.map((name, index) => (
                <li key={`${name}-${index}`} className="min-w-0 truncate">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </section>
        <Action detail={detail} />
      </ModuleBody>
    </ModulePage>
  );
}

function Action({
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
  if (detail.status === "cancelled") {
    return <p className="text-sm text-muted-foreground">Clase cancelada</p>;
  }
  if (detail.bookedByMe && detail.bookingId) {
    if (detail.canCancel) {
      return <CancelBookingButton bookingId={detail.bookingId} nextHref="/reservas" />;
    }
    return (
      <Button type="button" variant="outline" className="min-h-11 w-full" disabled>
        Cancelación cerrada
      </Button>
    );
  }
  if (detail.canBook) return <BookButton instanceId={detail.id} />;
  if (detail.freeSpots <= 0) {
    return (
      <Button type="button" className="min-h-11 w-full" disabled>
        Clase completa
      </Button>
    );
  }
  return <p className="text-sm text-muted-foreground">La clase ya empezó</p>;
}
