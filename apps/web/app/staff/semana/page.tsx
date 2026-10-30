import { LoadingState } from "@/components/feedback/loading-state";
import { Suspense } from "react";
import { eachDate } from "@78feet/domain";
import { requireStaff } from "@/lib/auth/current";
import { listWeek } from "@/lib/box/staff-calendar";
import { calendarAxisRange, getBoxHours } from "@/lib/box/hours";
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

async function Week({ searchParams }: { searchParams: Promise<{ semana?: string; tipo?: string }> }) {
  await requireStaff();
  const query = await searchParams;
  const now = new Date();
  const week = memberWeek(now, query.semana);
  const view = query.tipo === "open" ? "open" : "dirigidas";
  const [classes, hours] = await Promise.all([listWeek(week.start, now), getBoxHours()]);
  const filtered = classes.filter((item) => (view === "open" ? item.kind === "open" : item.kind === "directed"));

  return (
    <CalendarBoard
      variant="staff"
      description="Clases de la semana. Tocá un bloque para ver detalle, roster y acciones."
      view={view}
      title="Semana"
      basePath="/staff/semana"
      classHrefPrefix="/staff/clases"
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
    />
  );
}
