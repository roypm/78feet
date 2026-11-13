import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useSyncExternalStore,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "@/lib/spa/router";
import { cn } from "cn";

type IndicatorState = {
  left: number;
  top: number;
  width: number;
  height: number;
  opacity: number;
};

type SegmentSlideContextValue = {
  enabled: boolean;
  moveTo: (item: HTMLElement) => void;
  chipClass: (active: boolean) => string;
};

const SegmentSlideContext = createContext<SegmentSlideContextValue | null>(null);

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function useSegmentSlide() {
  return useContext(SegmentSlideContext);
}

function findActiveItem(root: HTMLElement): HTMLElement | null {
  return (
    root.querySelector<HTMLElement>('[data-segment-slide-item][aria-selected="true"]') ??
    root.querySelector<HTMLElement>('[data-segment-slide-item][aria-pressed="true"]') ??
    root.querySelector<HTMLElement>('[data-segment-slide-item][aria-current="page"]')
  );
}

function measureItem(wrap: HTMLElement, item: HTMLElement) {
  const wrapRect = wrap.getBoundingClientRect();
  const rect = item.getBoundingClientRect();
  return {
    left: rect.left - wrapRect.left + wrap.scrollLeft,
    top: rect.top - wrapRect.top + wrap.scrollTop,
    width: rect.width,
    height: rect.height,
    opacity: 1,
  };
}

/** Pastilla que se desliza al activo o al hover (solo puntero); sin glare del menú lateral. */
export function SegmentSlideList({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & React.ComponentProps<"div">) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointerInsideRef = useRef(false);
  const pathname = usePathname();
  const reduceMotion = usePrefersReducedMotion();
  const [indicator, setIndicator] = useState<IndicatorState>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    opacity: 0,
  });

  const syncActive = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap || reduceMotion) return;
    const active = findActiveItem(wrap);
    if (!active) {
      setIndicator((prev) => ({ ...prev, opacity: 0 }));
      return;
    }
    setIndicator((prev) => ({ ...prev, ...measureItem(wrap, active) }));
  }, [reduceMotion]);

  useLayoutEffect(() => {
    if (pointerInsideRef.current) return;
    syncActive();
  }, [pathname, syncActive]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || reduceMotion) return;
    const ro = new ResizeObserver(() => {
      if (!pointerInsideRef.current) syncActive();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [reduceMotion, syncActive]);

  const moveTo = useCallback(
    (item: HTMLElement) => {
      if (reduceMotion) return;
      const wrap = wrapRef.current;
      if (!wrap) return;
      pointerInsideRef.current = true;
      setIndicator((prev) => ({ ...prev, ...measureItem(wrap, item) }));
    },
    [reduceMotion],
  );

  const onLeave = useCallback(() => {
    pointerInsideRef.current = false;
    syncActive();
  }, [syncActive]);

  const enabled = !reduceMotion;

  const chipClass = useCallback(
    (active: boolean) =>
      enabled
        ? cn(
            "relative z-[1] flex min-h-8 touch-manipulation items-center justify-center rounded-sm px-2.5 text-sm font-medium transition-[scale,color] duration-150 ease-out active:scale-[0.97] bg-transparent",
            active ? "text-foreground" : "text-muted-foreground pointer-hover:text-foreground",
          )
        : cn(
            "flex min-h-8 touch-manipulation items-center justify-center rounded-sm px-2.5 text-sm font-medium transition-[scale,background-color,color] duration-150 ease-out active:scale-[0.97]",
            active
              ? "bg-card text-foreground"
              : "text-muted-foreground pointer-hover:bg-card/50 pointer-hover:text-foreground",
          ),
    [enabled],
  );

  const value = useMemo<SegmentSlideContextValue>(
    () => ({ enabled, moveTo, chipClass }),
    [enabled, moveTo, chipClass],
  );

  return (
    <SegmentSlideContext.Provider value={value}>
      <div
        ref={wrapRef}
        className={cn("relative", className)}
        onMouseLeave={onLeave}
        onScroll={() => {
          if (!pointerInsideRef.current) syncActive();
        }}
        {...rest}
      >
        {enabled ? (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute z-0 rounded-sm bg-card ring-1 ring-border/60",
              "transition-[left,top,width,height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            )}
            style={{
              left: indicator.left,
              top: indicator.top,
              width: indicator.width,
              height: indicator.height,
              opacity: indicator.opacity,
            }}
          />
        ) : null}
        {children}
      </div>
    </SegmentSlideContext.Provider>
  );
}

export function segmentSlideHandlers(slide: SegmentSlideContextValue | null) {
  return {
    "data-segment-slide-item": true as const,
    onMouseEnter: (event: { currentTarget: HTMLElement }) => slide?.moveTo(event.currentTarget),
  };
}

export function segmentSlideItemProps(active: boolean, slide: SegmentSlideContextValue | null) {
  return {
    ...segmentSlideHandlers(slide),
    className: slide ? slide.chipClass(active) : undefined,
  };
}
