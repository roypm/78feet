import { NavigationLink as Link } from "@/components/common/navigation/navigation-link";
import { SegmentSlideList, segmentSlideHandlers, useSegmentSlide } from "@/components/common/filters/segment-slide";
import { cn } from "cn";
import { formatWeekChip, formatWeekRange } from "@/lib/box/format";
import { calendarHref } from "@/lib/box/calendar-navigation";
import type { CalendarWeek, CalendarView } from "./types";

export function WeekNav({
  basePath,
  view,
  boxSlug,
  week,
  align,
  width = "content",
}: {
  basePath: string;
  view: CalendarView;
  boxSlug?: string;
  week: CalendarWeek;
  align?: "start" | "center";
  width?: "content" | "calendar";
}) {
  const navLink =
    "flex min-h-8 shrink-0 items-center rounded-sm px-2 text-sm text-primary pointer-hover:bg-card pointer-hover:underline underline-offset-4 transition-transform duration-150 ease-out active:scale-[0.97]";
  const navDisabled = "flex min-h-8 shrink-0 items-center rounded-sm px-2 text-sm text-muted-foreground";

  const chips = (
    <WeekChips basePath={basePath} view={view} boxSlug={boxSlug} week={week} />
  );

  if (width === "calendar") {
    return (
      <nav
        aria-label="Semanas"
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1"
      >
        {week.canPrev ? (
          <Link href={calendarHref(basePath, week.prev, view, boxSlug)} className={navLink}>
            Anterior
          </Link>
        ) : (
          <span className={navDisabled}>Anterior</span>
        )}
        <div className="flex min-w-0 justify-center overflow-x-auto px-1">{chips}</div>
        {week.canNext ? (
          <Link
            href={calendarHref(basePath, week.next, view, boxSlug)}
            className={cn(navLink, "justify-self-end")}
          >
            Siguiente
          </Link>
        ) : (
          <span className={cn(navDisabled, "justify-self-end")}>Siguiente</span>
        )}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Semanas"
      className={cn(
        "flex max-w-full min-w-0 flex-wrap items-center gap-2",
        align === "center" ? "mx-auto w-fit" : "w-fit self-start",
      )}
    >
      {week.canPrev ? (
        <Link href={calendarHref(basePath, week.prev, view, boxSlug)} className={navLink}>
          Anterior
        </Link>
      ) : (
        <span className={navDisabled}>Anterior</span>
      )}
      <div className="flex min-w-0 max-w-[min(100%,20rem)] overflow-x-auto sm:max-w-none">{chips}</div>
      {week.canNext ? (
        <Link href={calendarHref(basePath, week.next, view, boxSlug)} className={navLink}>
          Siguiente
        </Link>
      ) : (
        <span className={navDisabled}>Siguiente</span>
      )}
    </nav>
  );
}

function WeekChips({
  basePath,
  view,
  boxSlug,
  week,
}: {
  basePath: string;
  view: CalendarView;
  boxSlug?: string;
  week: CalendarWeek;
}) {
  return (
    <SegmentSlideList role="group" aria-label="Semanas del calendario" className="flex gap-0.5 rounded-md bg-muted p-0.5">
      {week.weeks.map((item) => (
        <WeekChip key={item.start} item={item} active={item.start === week.start} basePath={basePath} view={view} boxSlug={boxSlug} />
      ))}
    </SegmentSlideList>
  );
}

function WeekChip({
  item,
  active,
  basePath,
  view,
  boxSlug,
}: {
  item: CalendarWeek["weeks"][number];
  active: boolean;
  basePath: string;
  view: CalendarView;
  boxSlug?: string;
}) {
  const slide = useSegmentSlide();
  const chip = formatWeekChip(item.start);
  const className = cn(
    "flex min-h-8 shrink-0 touch-manipulation flex-col items-center justify-center rounded-sm px-2 text-xs font-medium leading-tight transition-[scale,color] duration-150 ease-out active:scale-[0.97]",
    slide?.enabled
      ? cn("relative z-[1] bg-transparent", active ? "text-foreground" : "text-muted-foreground pointer-hover:text-foreground")
      : active
        ? "bg-card text-foreground"
        : "text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground",
  );
  return (
    <Link
      href={calendarHref(basePath, item.start, view, boxSlug)}
      aria-current={active ? "page" : undefined}
      aria-label={`Semana del ${formatWeekRange(item.start, item.end)}`}
      {...segmentSlideHandlers(slide)}
      className={className}
    >
      <span className="tabular-nums">{chip.day}</span>
      <span>{chip.month}</span>
    </Link>
  );
}
