import { Suspense } from "react";
import { eachDate } from "@78feet/domain";
import { requireMember } from "@/lib/auth/current";
import { listCalendar } from "@/lib/box/calendar";
import { getBoxHours } from "@/lib/box/hours";
import { memberWeek } from "@/lib/box/week";
import { CalendarBoard } from "@/components/member/calendar-board";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; tipo?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader dense title="Calendario" />
          <ModuleBody fill>
            <p className="px-4 py-6 text-muted-foreground md:px-6">Cargando el calendario…</p>
          </ModuleBody>
        </ModulePage>
      }
    >
      <Calendar searchParams={searchParams} />
    </Suspense>
  );
}

async function Calendar({ searchParams }: { searchParams: Promise<{ semana?: string; tipo?: string }> }) {
  const user = await requireMember();
  const query = await searchParams;
  const now = new Date();
  const week = memberWeek(now, query.semana);
  const view = query.tipo === "open" ? "open" : "dirigidas";
  const [listed, hours] = await Promise.all([
    listCalendar(user.id, week.start, week.end, now),
    getBoxHours(),
  ]);
  const classes = listed.filter((item) =>
    view === "open" ? item.kind === "open" : item.kind === "directed",
  );

  return (
    <CalendarBoard
      view={view}
      hours={hours}
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
    />
  );
}
