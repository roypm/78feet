"use client";

import { ResourceImage } from "@/components/common/media/resource-image";

import { NavigationLink as Link } from "@/components/common/navigation/navigation-link";
import type { CalendarClass } from "@/lib/box/calendar";
import { BLOCK_INSET } from "@/lib/box/calendar-layout";
import { formatTime } from "@/lib/box/format";

export function ClassBlock({
  item,
  href,
  top,
  height,
  width,
  text,
}: {
  item: CalendarClass;
  href: string;
  top: number;
  height: number;
  width: number;
  text: string;
}) {
  const cancelled = item.status === "cancelled";
  const exception = item.isException;
  const occupancy = `${item.bookedCount}/${item.capacity}`;
  const range = `${formatTime(new Date(item.startAt))}–${formatTime(new Date(item.endAt))}`;
  const booked = !cancelled && item.bookedByMe ? "Apuntado" : "";
  const exceptionNote = exception ? ", excepción" : "";
  const hasImage = Boolean(item.imageUrl);
  const ariaLabel = cancelled
    ? `${item.name}, ${range}, Cancelada${exceptionNote}`
    : `${item.name}, ${range}, ${occupancy}${booked ? `, ${booked}` : ""}${exceptionNote}`;

  return (
    <Link
      href={href}
      prefetch={true}
      title={item.name}
      aria-label={ariaLabel}
      className={
        cancelled
          ? "absolute z-10 overflow-hidden rounded-md ring-2 ring-destructive/70 transition-[scale,box-shadow] duration-150 ease-out active:scale-[0.97] pointer-hover:ring-3 focus-visible:ring-3"
          : "absolute z-10 overflow-hidden rounded-md ring-1 ring-foreground/10 transition-[scale,box-shadow] duration-150 ease-out active:scale-[0.97] pointer-hover:ring-2 pointer-hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary"
      }
      style={{ top, height, left: BLOCK_INSET, width }}
    >
      {hasImage ? (
        <ResourceImage
          src={item.imageUrl!}
          alt=""
          className={cancelled ? "absolute inset-0 size-full object-cover opacity-40 saturate-50" : "absolute inset-0 size-full object-cover"}
        />
      ) : (
        <span className="absolute inset-0 bg-muted" aria-hidden />
      )}
      {exception ? (
        <span
          className={
            hasImage
              ? "absolute top-0.5 left-0.5 z-20 text-base font-bold leading-none text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]"
              : "absolute top-0.5 left-0.5 z-20 text-base font-bold leading-none text-foreground"
          }
          aria-hidden
        >
          *
        </span>
      ) : null}
      {cancelled ? (
        <span className="absolute inset-0 flex items-center justify-center bg-destructive/80 px-1 text-center font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
          <span className={text}>Cancelada</span>
        </span>
      ) : (
        <span
          className={
            hasImage
              ? "absolute inset-x-0 bottom-0 flex flex-col items-center px-1 pb-0.5 text-center text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.85)]"
              : "absolute inset-x-0 bottom-0 flex flex-col items-center px-1 pb-0.5 text-center text-foreground"
          }
        >
          {hasImage ? null : <span className={`min-w-0 max-w-full truncate ${text}`}>{item.name}</span>}
          <span className={`tabular-nums ${text}`}>{occupancy}</span>
          {booked ? <span className={`truncate ${text}`}>{booked}</span> : null}
        </span>
      )}
    </Link>
  );
}
