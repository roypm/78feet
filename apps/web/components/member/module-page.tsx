import type { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "cn";

/** Altura reservada de pestañas (KindTabs / FilterTabs) y de la columna `action`. */
const TAB_ROW_MIN_H = "min-h-8";
/** Una línea de descripción (`text-sm`). */
const DESC_ROW_MIN_H = "min-h-5";

export function ModulePage({ children }: { children: ReactNode }) {
  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>;
}

export function ModuleHeader({
  title,
  description,
  tabs,
  action,
  eyebrow,
  toolbar,
  children,
}: {
  title: string;
  description?: ReactNode;
  /** Dirigidas/Open, filtros Biblioteca, etc. — junto al título. */
  tabs?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
  toolbar?: ReactNode;
  /** Alias de `toolbar` (compat). */
  children?: ReactNode;
}) {
  const belowToolbar = toolbar ?? children;

  return (
    <header className="shrink-0 border-b border-border bg-header px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 md:px-6 md:pt-3">
      {eyebrow ? <div className="mb-1.5">{eyebrow}</div> : null}
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
          <SidebarTrigger className="-ml-2 shrink-0 md:hidden" />
          <h1 className="min-w-0 shrink-0 text-xl font-semibold wrap-break-word">{title}</h1>
          {tabs ? (
            <div className={cn("flex min-w-0 flex-wrap items-center gap-2", TAB_ROW_MIN_H)}>{tabs}</div>
          ) : null}
        </div>
        {action ? (
          <div className={cn("flex shrink-0 flex-wrap items-center justify-end gap-2", TAB_ROW_MIN_H)}>
            {action}
          </div>
        ) : null}
      </div>
      <div className="mt-1.5 flex flex-col gap-2">
        <div className={cn("flex items-center", DESC_ROW_MIN_H)}>
          {description ? (
            typeof description === "string" ? (
              <p className="text-sm leading-5 text-muted-foreground">{description}</p>
            ) : (
              description
            )
          ) : null}
        </div>
        {belowToolbar}
      </div>
    </header>
  );
}

/** Padding del cuerpo alineado con Plantilla / calendario staff (poco aire bajo el header). */
export const moduleContentInset = "px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-3";

/** Botón de alta u acción principal bajo el header (outline `min-h-11`). */
export function ModulePrimaryAction({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex justify-start", className)}>{children}</div>;
}

/** Contenedor de pestañas/filtros bajo la descripción (p. ej. semana en calendario). */
export function ModuleHeaderToolbar({
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
      className={cn("flex w-fit max-w-full flex-wrap rounded-md bg-muted p-0.5", className)}
    >
      {children}
    </div>
  );
}

export function ModuleBody({
  children,
  width = "reading",
  fill = false,
  inset = "default",
}: {
  children: ReactNode;
  width?: "reading" | "full";
  fill?: boolean;
  /** `content`: mismo aire que Plantilla (pt-2, gap-3). */
  inset?: "default" | "content";
}) {
  if (fill) {
    return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>;
  }

  const padding = inset === "content" ? moduleContentInset : "px-4 py-6 md:px-6";
  const stackGap = inset === "content" ? "gap-3" : "gap-6";

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto", padding)}>
      <div
        className={
          width === "reading"
            ? cn("flex w-full max-w-2xl flex-col", stackGap)
            : cn("flex min-w-0 flex-col", stackGap)
        }
      >
        {children}
      </div>
    </div>
  );
}
