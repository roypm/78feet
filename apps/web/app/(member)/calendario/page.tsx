import { LoadingState } from "@/components/feedback/loading-state";
import { Suspense } from "react";
import { eachDate } from "@78feet/domain";
import { requireMember } from "@/lib/auth/current";
import { listCalendar } from "@/lib/box/calendar";
import { listBoxes, memberBoxes, pickBox, rememberPreference } from "@/lib/box/boxes";
import { calendarAxisRange, getBoxHours } from "@/lib/box/hours";
import { memberWeek } from "@/lib/box/week";
import { CalendarBoard } from "@/components/member/calendar-board";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

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
  const [boxes, prefs] = await Promise.all([listBoxes(), memberBoxes(user.id)]);
  const preferred = boxes.find((box) => box.id === prefs.preferenceBoxId);
  const requested = query.box ? boxes.find((box) => box.id === query.box) : undefined;
  const box = requested ?? preferred ?? pickBox(boxes, undefined);
  if (requested && requested.id !== prefs.preferenceBoxId) {
    await rememberPreference(user.id, requested.id);
  }
  const week = memberWeek(now, query.semana);
  const view = query.tipo === "open" ? "open" : "dirigidas";
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
