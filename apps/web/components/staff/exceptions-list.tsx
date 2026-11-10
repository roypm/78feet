
import { ClassTypeThumb } from "@/components/class-type-thumb";

import { EmptyState } from "@/components/feedback/empty-state";
import { NavigationLink as Link } from "@/components/feedback/navigation-link";
import type { ExceptionInstance } from "@/lib/box/exceptions";
import { exceptionCardStatusLabel } from "@/lib/box/exceptions";
import { formatDay, formatTime } from "@/lib/box/format";

export function ExceptionsList({ items }: { items: ExceptionInstance[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        layout="panel"
        title="No hay excepciones desde hoy"
        description="Las clases extra y los cambios puntuales aparecerán acá. Usá Añadir clase extra si necesitás una sesión fuera de la plantilla."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const cancelled = item.status === "cancelled";
        const status = exceptionCardStatusLabel(item.kinds);
        const timeRange = `${formatTime(new Date(item.startAt))}–${formatTime(new Date(item.endAt))}`;
        const meta = [
          item.boxName,
          formatDay(item.date),
          timeRange,
          `${item.capacity} plazas`,
          item.coachName,
        ]
          .filter((part): part is string => Boolean(part))
          .join(" · ");

        return (
          <li
            key={item.id}
            className={
              cancelled
                ? "relative flex min-w-0 items-center gap-3 rounded-lg bg-card p-3 ring-2 ring-destructive/60"
                : "relative flex min-w-0 items-center gap-3 rounded-lg bg-card p-3 ring-1 ring-foreground/10"
            }
          >
            <Link
              href={`/staff/clases/${item.id}?desde=excepciones`}
              prefetch={true}
              aria-label={`${item.name}, ${status}, ${meta}`}
              className="absolute inset-0 z-0 rounded-lg focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/40"
            />
            <div className="relative size-12 shrink-0 overflow-hidden rounded-md">
              <ClassTypeThumb
                imageUrl={item.imageUrl}
                className={
                  cancelled
                    ? "pointer-events-none size-full opacity-40 saturate-50"
                    : "pointer-events-none size-full"
                }
              />
            </div>
            <span className="pointer-events-none relative min-w-0 flex-1">
              <span className="block truncate font-medium">
                {item.name}
                <span className="font-normal text-muted-foreground"> · {status}</span>
              </span>
              <span className="block truncate text-sm text-muted-foreground tabular-nums">{meta}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
