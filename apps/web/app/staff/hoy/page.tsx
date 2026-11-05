
import { ClassTypeThumb } from "@/components/class-type-thumb";

import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NavigationLink as Link } from "@/components/feedback/navigation-link";
import { localDateString } from "@78feet/domain";
import { requireStaff } from "@/lib/auth/current";
import { listDay } from "@/lib/box/staff-calendar";
import { groupDayByKind, kindViewFromParam, viewKind } from "@/lib/box/day-groups";
import { listBoxes, orderBoxes, pickBox, canonicalBoxRedirect } from "@/lib/box/boxes";
import { formatDay, formatTime, kindGroupLabel } from "@/lib/box/format";
import { BoxTabs } from "@/components/member/box-tabs";
import { KindTabs } from "@/components/member/kind-tabs";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";
import { ProfileAvatar } from "@/components/member/profile-avatar";

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
    item.status === "cancelled" ? null : `${item.bookedCount}/${item.capacity}`,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

export default function Page({ searchParams }: { searchParams: Promise<{ tipo?: string; box?: string }> }) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Hoy" />
          <ModuleBody width="full">
            <LoadingState variant="list" label="Cargando el día…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <Today searchParams={searchParams} />
    </Suspense>
  );
}

async function Today({ searchParams }: { searchParams: Promise<{ tipo?: string; box?: string }> }) {
  const user = await requireStaff();
  const query = await searchParams;
  const boxes = orderBoxes(await listBoxes(), user.preferenceBoxId);
  const view = kindViewFromParam(query.tipo);
  const canonical = canonicalBoxRedirect(boxes, query.box, user.preferenceBoxId, (id) =>
    view === "open" ? `/staff/hoy?box=${id}&tipo=open` : `/staff/hoy?box=${id}`,
  );
  if (canonical) redirect(canonical);
  const box = pickBox(boxes, query.box, user.preferenceBoxId);
  const activeKind = viewKind(view);
  const today = localDateString(new Date());
  const classes = await listDay(today, new Date(), box.id);
  const groups = groupDayByKind(classes);

  return (
    <ModulePage>
      <ModuleHeader
        title="Hoy"
        description={`Clases de ${formatDay(today)}. Tocá una para ver detalle y roster.`}
        tabs={
          <div className="flex flex-col items-start gap-2">
            <BoxTabs
              boxes={boxes}
              boxId={box.id}
              hrefFor={(id) => (view === "open" ? `/staff/hoy?box=${id}&tipo=open` : `/staff/hoy?box=${id}`)}
            />
            <KindTabs
              view={view}
              directedHref={`/staff/hoy?box=${box.id}`}
              openHref={`/staff/hoy?box=${box.id}&tipo=open`}
              className="xl:hidden"
            />
          </div>
        }
      />
      <ModuleBody width="full" inset="content">
        {classes.length === 0 ? (
          <EmptyState title="Hoy no hay clases programadas" description="Podés consultar las próximas clases en Semana." href="/staff/semana" action="Ver semana" />
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
                  <EmptyState compact title="Sin clases en esta grilla hoy" />
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
                            href={`/staff/clases/${item.id}?desde=hoy`}
                            prefetch={true}
                            aria-label={`${item.name}, ${meta}${item.coachName ? `, coach ${item.coachName}` : ""}`}
                            className="absolute inset-0 z-0 rounded-lg focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/40"
                          />
                          <div className="relative size-12 shrink-0 overflow-hidden rounded-md">
                            <ClassTypeThumb
                              imageUrl={item.imageUrl}
                              className={
                                cancelled
                                  ? "pointer-events-none size-full opacity-40 saturate-50"
                                  : "pointer-events-none size-full"
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
                            {item.coachName ? (
                              <span className="mt-1 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                                <ProfileAvatar name={item.coachName} imageUrl={item.coachProfileImageUrl} size="sm" />
                                <span className="min-w-0 truncate">{item.coachName}</span>
                              </span>
                            ) : null}
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
