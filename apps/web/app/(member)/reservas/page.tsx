import { useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CancelBookingButton } from "@/components/bookings/cancel-button";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { ListPagination } from "@/components/common/lists/list-pagination";
import { NavigationLink as Link } from "@/components/common/navigation/navigation-link";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { formatDay, formatTime, kindLabel } from "@/lib/box/format";
import { pageNumber } from "@/lib/box/pagination";
import { listUpcomingBookingsPage } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Mis reservas" />
    <ModuleBody width="full">
      <LoadingState variant="list" label="Cargando tus reservas…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const [params] = useSearchParams();
  const page = pageNumber(params.get("pagina") ?? undefined);
  const { account, query } = useAccountQuery(["bookings", "upcoming", page], () => listUpcomingBookingsPage(page));
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/calendario">
      {({ items: bookings, pageInfo }) => (
        <ModulePage>
          <ModuleHeader title="Mis reservas" description="Clases futuras a las que estás apuntado." />
          <ModuleBody width="full">
            {bookings.length === 0 ? (
              <ListEmptyBlock title="Todavía no tenés reservas" href="/calendario" action="Ver calendario" />
            ) : (
              <ul className="flex flex-col gap-3">
                {bookings.map((booking) => (
                  <li key={booking.id} className="flex flex-col gap-3 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{booking.instance.name}</p>
                        <p className="text-sm text-muted-foreground tabular-nums">
                          {booking.instance.boxName} · {formatDay(booking.instance.date)} · {formatTime(new Date(booking.instance.startAt))}
                        </p>
                      </div>
                      <Badge variant={booking.instance.kind === "directed" ? "default" : "secondary"}>{kindLabel(booking.instance.kind)}</Badge>
                    </div>
                    {booking.boxCancelled ? (
                      <p className="text-sm text-muted-foreground">Cancelada por el box</p>
                    ) : booking.canCancel ? (
                      <CancelBookingButton bookingId={booking.id} nextHref="/reservas" />
                    ) : (
                      <Button type="button" variant="outline" className="min-h-11 w-full" disabled>Cancelación cerrada</Button>
                    )}
                    <Link href={`/clases/${booking.instanceId}`} className="text-sm text-primary">Ver clase</Link>
                  </li>
                ))}
              </ul>
            )}
            <ListPagination pageInfo={pageInfo} path="/reservas" />
          </ModuleBody>
        </ModulePage>
      )}
    </QueryBody>
  );
}
