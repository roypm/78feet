import { Suspense } from "react";
import Link from "next/link";
import { localDateString } from "@78feet/domain";
import { requireStaff } from "@/lib/auth/current";
import { listDay } from "@/lib/box/staff-calendar";
import { groupDayByKind, kindViewFromParam, viewKind } from "@/lib/box/day-groups";
import { formatDay, formatTime, kindGroupLabel } from "@/lib/box/format";
import { KindTabs } from "@/components/member/kind-tabs";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

function todayClassMeta(item: {
  startAt: string;
  endAt: string;
  coachName: string | null;
  status: string;
  bookedCount: number;
  capacity: number;
}): string {
  return [
    `${formatTime(new Date(item.startAt))}–${formatTime(new Date(item.endAt))}`,
    item.coachName,
    item.status === "cancelled" ? null : `${item.bookedCount}/${item.capacity}`,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

export default function Page({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
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
      <Today searchParams={searchParams} />
    </Suspense>
  );
}

async function Today({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  await requireStaff();
  const query = await searchParams;
  const view = kindViewFromParam(query.tipo);
  const activeKind = viewKind(view);
  const today = localDateString(new Date());
  const classes = await listDay(today);
  const groups = groupDayByKind(classes);

  return (
    <ModulePage>
      <ModuleHeader
        title="Hoy"
        description={`Clases de ${formatDay(today)}. Tocá una para ver detalle y roster.`}
        tabs={
          <KindTabs
            view={view}
            directedHref="/staff/hoy"
            openHref="/staff/hoy?tipo=open"
            className="xl:hidden"
          />
        }
      />
      <ModuleBody width="full" inset="content">
        {classes.length === 0 ? (
          <p className="text-muted-foreground">No hay clases hoy.</p>
        ) : (
          <div className="flex flex-col gap-3 xl:grid xl:grid-cols-2 xl:items-start">
            {groups.map((group) => (
              <section
                key={group.kind}
                className={
                  group.kind === activeKind
                    ? "flex min-w-0 flex-col gap-3"
                    : "hidden min-w-0 flex-col gap-3 xl:flex"
                }
              >
                <h2 className="text-sm font-medium text-muted-foreground">{kindGroupLabel(group.kind)}</h2>
                {group.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin clases.</p>
                ) : (
                  <ul className="grid gap-3 lg:grid-cols-2 xl:grid-cols-1">
                    {group.items.map((item) => {
                      const cancelled = item.status === "cancelled";
                      const meta = todayClassMeta(item);
                      return (
                        <li
                          key={item.id}
                          className={
                            cancelled
                              ? "relative flex min-w-0 items-center gap-3 rounded-lg bg-card p-3 ring-2 ring-destructive/60"
                              : "relative flex min-w-0 items-center gap-3 rounded-lg bg-card p-3 ring-1 ring-foreground/10"
                          }
                        >
                          <Link
                            href={`/staff/clases/${item.id}`}
                            prefetch={true}
                            aria-label={`${item.name}, ${meta}`}
                            className="absolute inset-0 z-0 rounded-lg focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/40"
                          />
                          <div className="relative size-12 shrink-0 overflow-hidden rounded-md">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.imageUrl}
                              alt=""
                              className={
                                cancelled
                                  ? "pointer-events-none size-full object-cover opacity-40 saturate-50"
                                  : "pointer-events-none size-full object-cover"
                              }
                            />
                            {cancelled ? (
                              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-destructive/80 px-0.5 text-center text-[9px] font-semibold leading-tight text-white">
                                Cancelada
                              </span>
                            ) : null}
                          </div>
                          <span className="pointer-events-none relative min-w-0 flex-1">
                            <span className="block truncate font-medium">{item.name}</span>
                            <span className="block truncate text-sm text-muted-foreground tabular-nums">{meta}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </ModuleBody>
    </ModulePage>
  );
}
