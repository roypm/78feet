import { useSearchParams } from "react-router";
import { eachDate } from "@78feet/domain";
import { CalendarBoard } from "@/components/calendar/calendar-board";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { orderBoxes, pickBox } from "@/lib/box/boxes";
import { kindViewFromParam } from "@/lib/box/day-groups";
import { resolveFilter } from "@/lib/box/filter-url";
import { calendarAxisRange } from "@/lib/box/hours";
import { memberWeek } from "@/lib/box/week";
import { getBoxHours, listBoxes, listWeek } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";
import { useAccount } from "@/lib/spa/session";

const pending = (
  <ModulePage>
    <ModuleHeader title="Semana" />
    <ModuleBody fill>
      <div className="px-4 py-3 md:px-6">
        <LoadingState variant="calendar" label="Cargando la semana…" />
      </div>
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const [params] = useSearchParams();
  const semana = params.get("semana") ?? undefined;
  const grilla = params.get("grilla") ?? undefined;
  const boxSlug = params.get("box") ?? undefined;
  const preferenceId = useAccount()?.preferenceBoxId ?? "";
  const { account, query } = useAccountQuery(["week", preferenceId, boxSlug ?? "", semana ?? "", grilla ?? ""], async (account) => {
    const boxes = orderBoxes(await listBoxes(), account.preferenceBoxId);
    const view = kindViewFromParam(grilla);
    const box = pickBox(boxes, resolveFilter(boxes, boxSlug)?.id, account.preferenceBoxId);
    const week = memberWeek(new Date(), semana);
    const [classes, hours] = await Promise.all([listWeek(week.start, box.id), getBoxHours(box.id)]);
    return {
      view,
      box,
      boxes,
      week,
      hours,
      days: eachDate(week.start, week.end),
      classes: classes.filter((item) => (view === "open" ? item.kind === "open" : item.kind === "directed")),
      semana: semana ? week.start : undefined,
    };
  });
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/staff/hoy">
      {(data) => (
        <CalendarBoard
          variant="staff"
          description="Clases de la semana. Tocá un bloque para ver detalle, roster y acciones."
          view={data.view}
          title="Semana"
          basePath="/staff/semana"
          classHrefPrefix="/staff/clases"
          classHrefSearch="?desde=semana"
          semana={data.semana}
          today={data.week.today}
          hours={calendarAxisRange(data.hours)}
          openingHours={data.hours}
          week={{ start: data.week.start, canPrev: data.week.canPrev, canNext: data.week.canNext, prev: data.week.prev, next: data.week.next, weeks: data.week.weeks }}
          days={data.days}
          classes={data.classes}
          boxes={data.boxes}
          boxId={data.box.id}
        />
      )}
    </QueryBody>
  );
}
