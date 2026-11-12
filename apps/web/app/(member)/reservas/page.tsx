
import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ListPagination } from "@/components/common/lists/list-pagination";
import { pageNumber } from "@/lib/box/pagination";
import { Suspense } from "react";
import { NavigationLink as Link } from "@/components/common/navigation/navigation-link";
import { requireMember } from "@/lib/auth/current";
import { listUpcomingBookingsPage } from "@/lib/box/bookings";
import { formatDay, formatTime, kindLabel } from "@/lib/box/format";
import { CancelBookingButton } from "@/components/bookings/cancel-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Mis reservas" />
          <ModuleBody width="full">
            <LoadingState variant="list" label="Cargando tus reservas…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <Bookings searchParams={searchParams} />
    </Suspense>
  );
}

async function Bookings({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const user = await requireMember();
  const query = await searchParams;
  const { items: bookings, pageInfo } = await listUpcomingBookingsPage(user.id, pageNumber(query.pagina));

  return (
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
                <Badge variant={booking.instance.kind === "directed" ? "default" : "secondary"}>
                  {kindLabel(booking.instance.kind)}
                </Badge>
              </div>
              {booking.boxCancelled ? (
                <p className="text-sm text-muted-foreground">Cancelada por el box</p>
              ) : booking.canCancel ? (
                <CancelBookingButton bookingId={booking.id} nextHref="/reservas" />
              ) : (
                <Button type="button" variant="outline" className="min-h-11 w-full" disabled>
                  Cancelación cerrada
                </Button>
              )}
              <Link href={`/clases/${booking.instanceId}`} prefetch={true} className="text-sm text-primary">
                Ver clase
              </Link>
            </li>
          ))}
        </ul>
      )}
      <ListPagination pageInfo={pageInfo} path="/reservas" />
      </ModuleBody>
    </ModulePage>
  );
}
