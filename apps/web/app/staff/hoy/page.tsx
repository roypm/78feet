import { Suspense } from "react";
import Link from "next/link";
import { localDateString } from "@78feet/domain";
import { requireStaff } from "@/lib/auth/current";
import { listDay } from "@/lib/box/staff-calendar";
import { formatDay, formatTime, kindLabel } from "@/lib/box/format";
import { Badge } from "@/components/ui/badge";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Hoy" />
          <ModuleBody width="full">
            <p className="text-muted-foreground">Cargando el día…</p>
          </ModuleBody>
        </ModulePage>
      }
    >
      <Today />
    </Suspense>
  );
}

async function Today() {
  await requireStaff();
  const today = localDateString(new Date());
  const classes = await listDay(today);

  return (
    <ModulePage>
      <ModuleHeader title="Hoy">
        <p className="text-sm text-muted-foreground">{formatDay(today)}</p>
      </ModuleHeader>
      <ModuleBody width="full">
        {classes.length === 0 ? (
          <p className="text-muted-foreground">No hay clases hoy.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {classes.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt="" className="size-14 shrink-0 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium wrap-break-word">{item.name}</p>
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {formatTime(new Date(item.startAt))}–{formatTime(new Date(item.endAt))}
                      {item.coachName ? ` · ${item.coachName}` : ""}
                    </p>
                    <p className="text-sm tabular-nums">
                      {item.bookedCount}/{item.capacity}
                    </p>
                  </div>
                  <Badge variant={item.kind === "directed" ? "default" : "secondary"}>{kindLabel(item.kind)}</Badge>
                </div>
                {item.status === "cancelled" ? (
                  <p className="text-sm text-destructive">Cancelada</p>
                ) : item.roster.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nadie apuntado</p>
                ) : (
                  <ul className="flex flex-col gap-1 text-sm">
                    {item.roster.map((person) => (
                      <li key={person.bookingId} className="min-w-0 truncate">
                        {person.name}
                        {person.phone ? ` · ${person.phone}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
                <Link href={`/staff/clases/${item.id}`} className="text-sm text-primary">
                  Editar clase
                </Link>
              </li>
            ))}
          </ul>
        )}
      </ModuleBody>
    </ModulePage>
  );
}
