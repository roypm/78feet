import { Suspense } from "react";
import Link from "next/link";
import { requireMember } from "@/lib/auth/current";
import { listBookingHistory, type HistoryBookingView } from "@/lib/box/bookings";
import { formatDay, formatMonth, formatTime, kindLabel } from "@/lib/box/format";
import { groupHistoryByMonth } from "@/lib/box/history";
import { Badge } from "@/components/ui/badge";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Historial" description="Clases que ya empezaron, agrupadas por mes." />
          <ModuleBody>
            <p className="text-muted-foreground">Cargando tu historial…</p>
          </ModuleBody>
        </ModulePage>
      }
    >
      <History />
    </Suspense>
  );
}

function historyNote(booking: HistoryBookingView): string | null {
  if (booking.boxCancelled) return "Cancelada por el box";
  if (booking.status === "cancelled") return "Cancelada";
  return null;
}

async function History() {
  const user = await requireMember();
  const bookings = await listBookingHistory(user.id);
  const months = groupHistoryByMonth(bookings);

  return (
    <ModulePage>
      <ModuleHeader
        title="Historial"
        description="Clases que ya empezaron, agrupadas por mes. No registra asistencia."
      />
      <ModuleBody>
        {months.length === 0 ? (
          <p className="text-muted-foreground">No tenés clases anteriores.</p>
        ) : (
          <div className="flex flex-col gap-8">
            {months.map((group) => (
              <section key={group.month} className="flex flex-col gap-3">
                <h2 className="text-sm font-medium text-muted-foreground">{formatMonth(group.month)}</h2>
                <ul className="flex flex-col gap-3">
                  {group.items.map((booking) => {
                    const note = historyNote(booking);
                    return (
                      <li
                        key={booking.id}
                        className="flex flex-col gap-3 rounded-lg bg-card p-3 ring-1 ring-foreground/10"
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{booking.instance.name}</p>
                            <p className="text-sm text-muted-foreground tabular-nums">
                              {formatDay(booking.instance.date)} · {formatTime(new Date(booking.instance.startAt))}–
                              {formatTime(new Date(booking.instance.endAt))}
                            </p>
                            {booking.coachName ? (
                              <p className="text-sm wrap-break-word text-muted-foreground">{booking.coachName}</p>
                            ) : null}
                          </div>
                          <Badge variant={booking.instance.kind === "directed" ? "default" : "secondary"}>
                            {kindLabel(booking.instance.kind)}
                          </Badge>
                        </div>
                        {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
                        <Link href={`/clases/${booking.instanceId}`} prefetch={true} className="text-sm text-primary">
                          Ver clase
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </ModuleBody>
    </ModulePage>
  );
}
