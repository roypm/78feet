
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Suspense } from "react";
import { NavigationLink as Link } from "@/components/feedback/navigation-link";
import { requireMember } from "@/lib/auth/current";
import { listUpcomingBookings } from "@/lib/box/bookings";
import { formatDay, formatTime, kindLabel } from "@/lib/box/format";
import { CancelBookingButton } from "@/components/member/cancel-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Mis reservas" />
          <ModuleBody>
            <LoadingState variant="list" label="Cargando tus reservas…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <Bookings />
    </Suspense>
  );
}

async function Bookings() {
  const user = await requireMember();
  const bookings = await listUpcomingBookings(user.id);

  return (
    <ModulePage>
      <ModuleHeader title="Mis reservas" description="Clases futuras a las que estás apuntado." />
      <ModuleBody>
      {bookings.length === 0 ? (
        <EmptyState title="Todavía no tenés reservas" description="Elegí una clase del calendario para reservar tu plaza." href="/calendario" action="Ver calendario" />
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((booking) => (
            <li key={booking.id} className="flex flex-col gap-3 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{booking.instance.name}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {formatDay(booking.instance.date)} · {formatTime(new Date(booking.instance.startAt))}
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
      </ModuleBody>
    </ModulePage>
  );
}
