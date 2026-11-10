"use client";

import { NavigationLink as Link } from "@/components/feedback/navigation-link";
import type { ReactNode } from "react";
import { cn } from "cn";
import { SegmentSlideList, segmentSlideItemProps, useSegmentSlide } from "@/components/member/segment-slide";

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
    <SegmentSlideList
      role="tablist"
      aria-label="Tipo de clase"
      className={cn("grid w-fit max-w-full shrink-0 grid-cols-2 rounded-md bg-muted p-0.5", className)}
    >
      <Tab href={directedHref} active={view === "dirigidas"}>
        Dirigidas
      </Tab>
      <Tab href={openHref} active={view === "open"}>
        Open
      </Tab>
    </SegmentSlideList>
  );
}

/** Chips estáticos cuando `prefers-reduced-motion` o fuera de `SegmentSlideList`. */
export function chipClass(active: boolean): string {
  return cn(
    "flex min-h-8 touch-manipulation items-center justify-center rounded-sm px-2.5 text-sm font-medium transition-[scale,background-color,color] duration-150 ease-out active:scale-[0.97]",
    active
      ? "bg-card text-foreground"
      : "text-muted-foreground pointer-hover:bg-card/50 pointer-hover:text-foreground",
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: string }) {
  const slide = useSegmentSlide();
  const slideProps = segmentSlideItemProps(active, slide);
  return (
    <Link
      href={href}
      prefetch={true}
      role="tab"
      aria-selected={active}
      {...slideProps}
      className={cn(slideProps.className ?? chipClass(active), "min-w-0 w-full")}
    >
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
  const slide = useSegmentSlide();
  const slideProps = segmentSlideItemProps(active, slide);
  return (
    <Link
      href={href}
      prefetch={true}
      role="tab"
      aria-selected={active}
      {...slideProps}
      className={cn(slideProps.className ?? chipClass(active), "max-w-48 shrink-0 overflow-hidden")}
    >
      <span className="min-w-0 truncate">{children}</span>
    </Link>
  );
}

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
    <SegmentSlideList
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex max-w-[min(100vw-8rem,24rem)] gap-0.5 overflow-x-auto rounded-md bg-muted p-0.5 sm:max-w-md md:max-w-lg",
        className,
      )}
    >
      {children}
    </SegmentSlideList>
  );
}
