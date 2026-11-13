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
import { getBoxHours, listBoxes, listCalendar } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";
import { useAccount } from "@/lib/spa/session";

const pending = (
  <ModulePage>
    <ModuleHeader title="Calendario" description="Cuatro semanas de clases." />
    <ModuleBody fill>
      <div className="px-4 py-3 md:px-6">
        <LoadingState variant="calendar" label="Cargando el calendario…" />
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
  const { account, query } = useAccountQuery(
    ["calendar", "member", preferenceId, boxSlug ?? "", semana ?? "", grilla ?? ""],
    async (account) => {
      const preference = account.preferenceBoxId;
      const boxes = orderBoxes(await listBoxes(), preference);
      const view = kindViewFromParam(grilla);
      const box = pickBox(boxes, resolveFilter(boxes, boxSlug)?.id, preference);
      const now = new Date();
      const week = memberWeek(now, semana);
      const [listed, hours] = await Promise.all([
        listCalendar(week.start, week.end, box.id),
        getBoxHours(box.id),
      ]);
      return {
        view,
        hours,
        semana: semana ? week.start : undefined,
        week,
        days: eachDate(week.start, week.end),
        classes: listed.filter((item) => (view === "open" ? item.kind === "open" : item.kind === "directed")),
        boxes,
        boxId: box.id,
      };
    },
  );
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/calendario">
      {(data) => (
        <CalendarBoard
          view={data.view}
          hours={calendarAxisRange(data.hours)}
          openingHours={data.hours}
          semana={data.semana}
          today={data.week.today}
          week={{
            start: data.week.start,
            canPrev: data.week.canPrev,
            canNext: data.week.canNext,
            prev: data.week.prev,
            next: data.week.next,
            weeks: data.week.weeks,
          }}
          days={data.days}
          classes={data.classes}
          boxes={data.boxes}
          boxId={data.boxId}
        />
      )}
    </QueryBody>
  );
}
