
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { ListPagination } from "@/components/member/list-pagination";
import { Suspense } from "react";
import { NavigationLink as Link } from "@/components/feedback/navigation-link";
import { requireMember } from "@/lib/auth/current";
import { listBookingHistoryPage, type HistoryBookingView } from "@/lib/box/bookings";
import { formatDay, formatMonth, formatTime, kindLabel } from "@/lib/box/format";
import { groupHistoryByMonth } from "@/lib/box/history";
import { pageNumber } from "@/lib/box/pagination";
import { Badge } from "@/components/ui/badge";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";
import { ProfileAvatar } from "@/components/member/profile-avatar";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Historial" description="Clases que ya empezaron, agrupadas por mes." />
          <ModuleBody>
            <LoadingState variant="list" label="Cargando tu historial…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <History searchParams={searchParams} />
    </Suspense>
  );
}

function historyNote(booking: HistoryBookingView): string | null {
  if (booking.boxCancelled) return "Cancelada por el box";
  if (booking.status === "cancelled") return "Cancelada";
  return null;
}

async function History({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const user = await requireMember();
  const query = await searchParams;
  const { items: bookings, pageInfo } = await listBookingHistoryPage(user.id, pageNumber(query.pagina));
  const months = groupHistoryByMonth(bookings);

  return (
    <ModulePage>
      <ModuleHeader
        title="Historial"
        description="Clases que ya empezaron, agrupadas por mes. No registra asistencia."
      />
      <ModuleBody>
        {months.length === 0 ? (
          <EmptyState title="Todavía no hay reservas anteriores" description="Acá aparecerán tus reservas cuando la clase haya empezado. Este historial no registra asistencia." href="/calendario" action="Ver calendario" />
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
                              {booking.instance.boxName} · {formatDay(booking.instance.date)} · {formatTime(new Date(booking.instance.startAt))}–
                              {formatTime(new Date(booking.instance.endAt))}
                            </p>
                            {booking.coachName ? (
                              <div className="mt-1 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                                <ProfileAvatar name={booking.coachName} imageUrl={booking.coachProfileImageUrl} size="sm" />
                                <span className="min-w-0 wrap-break-word">{booking.coachName}</span>
                              </div>
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
            <ListPagination pageInfo={pageInfo} path="/historial" />
          </div>
        )}
      </ModuleBody>
    </ModulePage>
  );
}
