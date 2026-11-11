import { LoadingState } from "@/components/common/feedback/loading-state";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { eachDate } from "@78feet/domain";
import { requireMember } from "@/lib/auth/current";
import { listCalendar } from "@/lib/box/calendar";
import { calendarHref } from "@/lib/box/calendar-navigation";
import { listBoxes, orderBoxes, pickBox, canonicalBoxRedirect } from "@/lib/box/boxes";
import { calendarAxisRange, getBoxHours } from "@/lib/box/hours";
import { memberWeek } from "@/lib/box/week";
import { CalendarBoard } from "@/components/calendar/calendar-board";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; tipo?: string; box?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Calendario" description="Cuatro semanas de clases." />
          <ModuleBody fill>
            <div className="px-4 py-3 md:px-6"><LoadingState variant="calendar" label="Cargando el calendario…" /></div>
          </ModuleBody>
        </ModulePage>
      }
    >
      <Calendar searchParams={searchParams} />
    </Suspense>
  );
}

async function Calendar({ searchParams }: { searchParams: Promise<{ semana?: string; tipo?: string; box?: string }> }) {
  const user = await requireMember();
  const query = await searchParams;
  const now = new Date();
  const boxes = orderBoxes(await listBoxes(), user.preferenceBoxId);
  const view = query.tipo === "open" ? "open" : "dirigidas";
  const canonical = canonicalBoxRedirect(boxes, query.box, user.preferenceBoxId, (id) =>
    calendarHref("/calendario", query.semana, view, id),
  );
  if (canonical) redirect(canonical);
  const box = pickBox(boxes, query.box, user.preferenceBoxId);
  const week = memberWeek(now, query.semana);
  const [listed, hours] = await Promise.all([
    listCalendar(user.id, week.start, week.end, now, box.id),
    getBoxHours(undefined, box.id),
  ]);
  const classes = listed.filter((item) =>
    view === "open" ? item.kind === "open" : item.kind === "directed",
  );

  return (
    <CalendarBoard
      view={view}
      hours={calendarAxisRange(hours)}
      openingHours={hours}
      semana={query.semana ? week.start : undefined}
      today={week.today}
      week={{
        start: week.start,
        canPrev: week.canPrev,
        canNext: week.canNext,
        prev: week.prev,
        next: week.next,
        weeks: week.weeks,
      }}
      days={eachDate(week.start, week.end)}
      classes={classes}
      boxes={boxes}
      boxId={box.id}
    />
  );
}
