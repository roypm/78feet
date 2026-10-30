import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "cn";

export type KindView = "dirigidas" | "open";

export function KindTabs({
  view,
  directedHref,
  openHref,
  className,
}: {
  view: KindView;
  directedHref: string;
  openHref: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label="Tipo de clase" className={cn("flex w-fit rounded-md bg-muted p-0.5", className)}>
      <Tab href={directedHref} active={view === "dirigidas"}>
        Dirigidas
      </Tab>
      <Tab href={openHref} active={view === "open"}>
        Open
      </Tab>
    </div>
  );
}

export function chipClass(active: boolean): string {
  return active
    ? "flex min-h-8 touch-manipulation items-center rounded-sm bg-card px-2.5 text-sm font-semibold text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
    : "flex min-h-8 touch-manipulation items-center rounded-sm px-2.5 text-sm text-muted-foreground transition-transform duration-150 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground";
}

function Tab({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <Link href={href} prefetch={true} role="tab" aria-selected={active} className={chipClass(active)}>
      {children}
    </Link>
  );
}

export function FilterTabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: string;
}) {
  return (
    <Link
      href={href}
      prefetch={true}
      role="tab"
      aria-selected={active}
      className={cn(chipClass(active), "shrink-0 whitespace-nowrap")}
    >
      {children}
    </Link>
  );
}

/** Misma fila y estilo que KindTabs en el header (`tabs`), para filtros por query (p. ej. Biblioteca). */
export function FilterTabs({
  children,
  className,
  "aria-label": ariaLabel = "Filtros",
}: {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex max-w-[min(100vw-8rem,24rem)] gap-0.5 overflow-x-auto rounded-md bg-muted p-0.5 sm:max-w-md md:max-w-lg",
        className,
      )}
    >
      {children}
    </div>
  );
}
