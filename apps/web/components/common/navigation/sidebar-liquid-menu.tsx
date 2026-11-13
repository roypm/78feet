import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "@/lib/spa/router";
import { cn } from "cn";

type IndicatorState = {
  top: number;
  height: number;
  opacity: number;
  glareX: number;
  glareY: number;
};

type SidebarLiquidContextValue = {
  enabled: boolean;
  moveTo: (item: HTMLElement) => void;
  onMove: (item: HTMLElement, event: React.MouseEvent) => void;
};

const SidebarLiquidContext = createContext<SidebarLiquidContextValue | null>(null);

export function useSidebarLiquid() {
  return useContext(SidebarLiquidContext);
}

function findActiveItem(root: HTMLElement): HTMLElement | null {
  const current = root.querySelector<HTMLElement>('[data-slot="sidebar-menu-button"][data-active]');
  if (current) {
    return current.closest('[data-sidebar="menu-item"]') ?? current;
  }
  const page = root.querySelector<HTMLElement>('[aria-current="page"][data-slot="sidebar-menu-button"]');
  if (page) return page.closest('[data-sidebar="menu-item"]') ?? page;
  return null;
}

/** Un solo indicador para toda la navegación; vuelve al ítem activo solo al salir del bloque. */
export function SidebarLiquidNav({ children }: { children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointerInsideRef = useRef(false);
  const pathname = usePathname();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [indicator, setIndicator] = useState<IndicatorState>({
    top: 0,
    height: 0,
    opacity: 0,
    glareX: 50,
    glareY: 50,
  });

  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const measure = useCallback((item: HTMLElement) => {
    const wrap = wrapRef.current;
    if (!wrap) return { top: 0, height: 0, opacity: 0 };
    const wrapRect = wrap.getBoundingClientRect();
    const rect = item.getBoundingClientRect();
    return {
      top: rect.top - wrapRect.top + wrap.scrollTop,
      height: rect.height,
      opacity: 1,
    };
  }, []);

  const syncActive = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap || reduceMotion) return;
    const active = findActiveItem(wrap);
    if (!active) {
      setIndicator((prev) => ({ ...prev, opacity: 0 }));
      return;
    }
    setIndicator((prev) => ({ ...prev, ...measure(active), glareX: 50, glareY: 50 }));
  }, [measure, reduceMotion]);

  useLayoutEffect(() => {
    if (pointerInsideRef.current) return;
    syncActive();
  }, [pathname, syncActive]);

  const moveTo = useCallback(
    (item: HTMLElement) => {
      if (reduceMotion) return;
      pointerInsideRef.current = true;
      setIndicator((prev) => ({ ...prev, ...measure(item), glareX: 50, glareY: 50 }));
    },
    [measure, reduceMotion],
  );

  const onMove = useCallback((item: HTMLElement, event: React.MouseEvent) => {
    if (reduceMotion) return;
    const rect = item.getBoundingClientRect();
    const glareX = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 100;
    const glareY = ((event.clientY - rect.top) / Math.max(rect.height, 1)) * 100;
    setIndicator((prev) => ({ ...prev, glareX, glareY }));
  }, [reduceMotion]);

  const onLeaveNav = useCallback(() => {
    pointerInsideRef.current = false;
    syncActive();
  }, [syncActive]);

  const value = useMemo<SidebarLiquidContextValue>(
    () => ({
      enabled: !reduceMotion,
      moveTo,
      onMove,
    }),
    [moveTo, onMove, reduceMotion],
  );

  return (
    <SidebarLiquidContext.Provider value={value}>
      <div
        ref={wrapRef}
        className="relative flex flex-col gap-2"
        onMouseEnter={() => {
          pointerInsideRef.current = true;
        }}
        onMouseLeave={onLeaveNav}
      >
        {!reduceMotion ? (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 z-0 rounded-md",
              "transition-[top,height,opacity,background] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            )}
            style={{
              top: indicator.top,
              height: indicator.height,
              opacity: indicator.opacity,
              background: `radial-gradient(circle at ${indicator.glareX}% ${indicator.glareY}%, color-mix(in srgb, var(--sidebar-primary) 32%, transparent), var(--sidebar-accent))`,
            }}
          />
        ) : null}
        <div className="relative z-[1] flex flex-col gap-2">{children}</div>
      </div>
    </SidebarLiquidContext.Provider>
  );
}
