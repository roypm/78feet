import { resolveFilter } from "@/lib/box/filter-url";

import { ClassTypeThumb } from "@/components/class-types/class-type-thumb";

import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Suspense } from "react";
import { NavigationLink as Link } from "@/components/common/navigation/navigation-link";
import { localDateString } from "@78feet/domain";
import { requireStaff } from "@/lib/auth/current";
import { listDay } from "@/lib/box/staff-calendar";
import { groupDayByKind, kindViewFromParam, viewKind } from "@/lib/box/day-groups";
import { listBoxes, orderBoxes, pickBox } from "@/lib/box/boxes";
import { formatDay, formatTime, kindGroupLabel } from "@/lib/box/format";
import { BoxTabs } from "@/components/boxes/box-tabs";
import { KindTabs } from "@/components/common/filters/kind-tabs";
import { ModuleBody, ModuleHeader, ModulePage, ModuleHeaderTabStack } from "@/components/common/layout/module-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function todayClassMeta(item: {
  startAt: string;
  endAt: string;
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

export default function Page({ searchParams }: { searchParams: Promise<{ grilla?: string; box?: string }> }) {
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

async function Today({ searchParams }: { searchParams: Promise<{ grilla?: string; box?: string }> }) {
  const user = await requireStaff();
  const query = await searchParams;
  const boxes = orderBoxes(await listBoxes(), user.preferenceBoxId);
  const view = kindViewFromParam(query.grilla);
  const box = pickBox(boxes, resolveFilter(boxes, query.box)?.id, user.preferenceBoxId);
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
          <ModuleHeaderTabStack>
            <BoxTabs
              boxes={boxes}
              boxId={box.id}
              hrefFor={(id) => (view === "open" ? `/staff/hoy?box=${id}&grilla=open` : `/staff/hoy?box=${id}`)}
            />
            <KindTabs
              view={view}
              directedHref={`/staff/hoy?box=${box.slug}`}
              openHref={`/staff/hoy?box=${box.slug}&grilla=open`}
              className="xl:hidden"
            />
          </ModuleHeaderTabStack>
        }
      />
      <ModuleBody width="full" inset="content">
        {classes.length === 0 ? (
          <ListEmptyBlock title="Hoy no hay clases programadas" href="/staff/semana" action="Ver semana" />
        ) : (
          <div className="flex flex-col gap-3 xl:grid xl:grid-cols-2 xl:items-start">
            {groups.map((group) => (
              <Card
                key={group.kind}
                size="sm"
                role="region"
                aria-labelledby={`today-${group.kind}`}
                className={group.kind === activeKind ? "min-w-0" : "hidden min-w-0 xl:flex"}
              >
                <CardHeader className="border-b">
                  <CardTitle><h2 id={`today-${group.kind}`}>{kindGroupLabel(group.kind)}</h2></CardTitle>
                </CardHeader>
                <CardContent>
                  {group.items.length === 0 ? (
                    <ListEmptyBlock title="Sin clases en esta grilla hoy" />
                  ) : (
                    <ul className="divide-y divide-border">
                      {group.items.map((item) => {
                        const cancelled = item.status === "cancelled";
                        const meta = todayClassMeta(item);
                        return (
                          <li key={item.id}>
                            <Link
                              href={`/staff/clases/${item.id}?desde=hoy`}
                              prefetch={true}
                              aria-label={`${item.name}, ${meta}${cancelled ? ", Cancelada" : ""}`}
                              className="flex min-w-0 items-center gap-2 rounded-md px-2 py-2 pointer-hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                            >
                              <ClassTypeThumb imageUrl={item.imageUrl} className="size-10 shrink-0 rounded-md" />
                              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                                  <span className="min-w-0 wrap-break-word font-medium">{item.name}</span>
                                  {cancelled ? <Badge variant="destructive">Cancelada</Badge> : null}
                                </span>
                                <span className="text-sm text-muted-foreground tabular-nums">{meta}</span>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ModuleBody>
    </ModulePage>
  );
}
