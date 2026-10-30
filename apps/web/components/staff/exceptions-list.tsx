import Link from "next/link";
import type { ExceptionInstance } from "@/lib/box/exceptions";
import { exceptionKindLabel } from "@/lib/box/exceptions";
import { formatDay, formatTime } from "@/lib/box/format";
import { Badge } from "@/components/ui/badge";

function kindGridLabel(kind: ExceptionInstance["kind"]): string {
  return kind === "open" ? "Open" : "Dirigida";
}

export function ExceptionsList({ items }: { items: ExceptionInstance[] }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground">No hay excepciones desde hoy.</p>;
  }

  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {items.map((item) => {
        const cancelled = item.status === "cancelled";
        const timeRange = `${formatTime(new Date(item.startAt))}–${formatTime(new Date(item.endAt))}`;
        const meta = [
          formatDay(item.date),
          timeRange,
          item.coachName,
          cancelled ? null : `${item.bookedCount}/${item.capacity}`,
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
              href={`/staff/clases/${item.id}`}
              prefetch={true}
              aria-label={`${item.name}, ${meta}`}
              className="absolute inset-0 z-0 rounded-lg focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/40"
            />
            <div className="relative size-12 shrink-0 overflow-hidden rounded-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt=""
                className={
                  cancelled
                    ? "pointer-events-none size-full object-cover opacity-40 saturate-50"
                    : "pointer-events-none size-full object-cover"
                }
              />
              {cancelled ? (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-destructive/80 px-0.5 text-center text-[9px] font-semibold leading-tight text-white">
                  Cancelada
                </span>
              ) : null}
            </div>
            <span className="pointer-events-none relative min-w-0 flex-1">
              <span className="block truncate font-medium">{item.name}</span>
              <span className="block truncate text-sm text-muted-foreground tabular-nums">{meta}</span>
              <span className="block text-sm text-muted-foreground">{kindGridLabel(item.kind)}</span>
            </span>
            <div className="relative z-10 flex max-w-[40%] shrink-0 flex-wrap justify-end gap-1">
              {item.kinds.map((kind) => (
                <Badge
                  key={kind}
                  variant={kind === "cancelled" ? "destructive" : kind === "extra" ? "outline" : "secondary"}
                >
                  {exceptionKindLabel(kind)}
                </Badge>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
