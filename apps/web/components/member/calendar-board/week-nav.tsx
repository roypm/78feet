"use client";

import { NavigationLink as Link } from "@/components/feedback/navigation-link";
import { cn } from "cn";
import { formatWeekChip, formatWeekRange } from "@/lib/box/format";
import { calendarHref } from "@/lib/box/calendar-navigation";
import type { CalendarWeek, CalendarView } from "./types";

export function WeekNav({
  basePath,
  view,
  week,
  align,
  width = "content",
}: {
  basePath: string;
  view: CalendarView;
  week: CalendarWeek;
  align?: "start" | "center";
  width?: "content" | "calendar";
}) {
  const navLink =
    "flex min-h-8 shrink-0 items-center rounded-sm px-2 text-sm text-primary pointer-hover:bg-card pointer-hover:underline underline-offset-4 transition-transform duration-150 ease-out active:scale-[0.97]";
  const navDisabled = "flex min-h-8 shrink-0 items-center rounded-sm px-2 text-sm text-muted-foreground";

  const chips = (
    <div className="flex gap-1 rounded-md bg-muted p-0.5">
      {week.weeks.map((item) => {
        const active = item.start === week.start;
        const chip = formatWeekChip(item.start);
        return (
          <Link
            key={item.start}
            href={calendarHref(basePath, item.start, view)}
            prefetch={true}
            aria-current={active ? "page" : undefined}
            aria-label={`Semana del ${formatWeekRange(item.start, item.end)}`}
            className={
              active
                ? "flex min-h-8 shrink-0 touch-manipulation flex-col items-center justify-center rounded-sm bg-card px-2 text-xs leading-tight font-semibold text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
                : "flex min-h-8 shrink-0 touch-manipulation flex-col items-center justify-center rounded-sm px-2 text-xs leading-tight text-muted-foreground transition-transform duration-150 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground"
            }
          >
            <span className="tabular-nums">{chip.day}</span>
            <span>{chip.month}</span>
          </Link>
        );
      })}
    </div>
  );

  if (width === "calendar") {
    return (
      <nav
        aria-label="Semanas"
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1"
      >
        {week.canPrev ? (
          <Link href={calendarHref(basePath, week.prev, view)} prefetch={true} className={navLink}>
            Anterior
          </Link>
        ) : (
          <span className={navDisabled}>Anterior</span>
        )}
        <div className="flex min-w-0 justify-center overflow-x-auto px-1">{chips}</div>
        {week.canNext ? (
          <Link
            href={calendarHref(basePath, week.next, view)}
            prefetch={true}
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
        <Link href={calendarHref(basePath, week.prev, view)} prefetch={true} className={navLink}>
          Anterior
        </Link>
      ) : (
        <span className={navDisabled}>Anterior</span>
      )}
      <div className="flex min-w-0 max-w-[min(100%,20rem)] overflow-x-auto sm:max-w-none">{chips}</div>
      {week.canNext ? (
        <Link href={calendarHref(basePath, week.next, view)} prefetch={true} className={navLink}>
          Siguiente
        </Link>
      ) : (
        <span className={navDisabled}>Siguiente</span>
      )}
    </nav>
  );
}
