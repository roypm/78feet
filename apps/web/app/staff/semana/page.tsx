import { resolveFilter } from "@/lib/box/filter-url";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Suspense } from "react";
import { eachDate } from "@78feet/domain";
import { requireStaff } from "@/lib/auth/current";
import { listWeek } from "@/lib/box/staff-calendar";
import { listBoxes, orderBoxes, pickBox } from "@/lib/box/boxes";
import { calendarAxisRange, getBoxHours } from "@/lib/box/hours";
import { memberWeek } from "@/lib/box/week";
import { CalendarBoard } from "@/components/calendar/calendar-board";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; grilla?: string; box?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Semana" />
          <ModuleBody fill>
            <div className="px-4 py-3 md:px-6"><LoadingState variant="calendar" label="Cargando la semana…" /></div>
          </ModuleBody>
        </ModulePage>
      }
    >
      <Week searchParams={searchParams} />
    </Suspense>
  );
}

async function Week({ searchParams }: { searchParams: Promise<{ semana?: string; grilla?: string; box?: string }> }) {
  const user = await requireStaff();
  const query = await searchParams;
  const boxes = orderBoxes(await listBoxes(), user.preferenceBoxId);
  const view = query.grilla === "open" ? "open" : "dirigidas";
  const box = pickBox(boxes, resolveFilter(boxes, query.box)?.id, user.preferenceBoxId);
  const now = new Date();
  const week = memberWeek(now, query.semana);
  const [classes, hours] = await Promise.all([listWeek(week.start, now, box.id), getBoxHours(undefined, box.id)]);
  const filtered = classes.filter((item) => (view === "open" ? item.kind === "open" : item.kind === "directed"));

  return (
    <CalendarBoard
      variant="staff"
      description="Clases de la semana. Tocá un bloque para ver detalle, roster y acciones."
      view={view}
      title="Semana"
      basePath="/staff/semana"
      classHrefPrefix="/staff/clases"
      classHrefSearch="?desde=semana"
      semana={query.semana ? week.start : undefined}
      today={week.today}
      hours={calendarAxisRange(hours)}
      openingHours={hours}
      week={{
        start: week.start,
        canPrev: week.canPrev,
        canNext: week.canNext,
        prev: week.prev,
        next: week.next,
        weeks: week.weeks,
      }}
      days={eachDate(week.start, week.end)}
      classes={filtered}
      boxes={boxes}
      boxId={box.id}
    />
  );
}
