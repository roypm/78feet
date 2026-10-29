import type { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function ModulePage({ children }: { children: ReactNode }) {
  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>;
}

export function ModuleHeader({
  title,
  action,
  eyebrow,
  children,
  dense = false,
}: {
  title: string;
  action?: ReactNode;
  eyebrow?: ReactNode;
  children?: ReactNode;
  dense?: boolean;
}) {
  return (
    <header
      className={
        dense
          ? "shrink-0 border-b border-border bg-header px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 md:px-6 md:pt-2"
          : "shrink-0 border-b border-border bg-header px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 md:px-6 md:pt-4"
      }
    >
      {eyebrow ? <div className="mb-2">{eyebrow}</div> : null}
      <div className="flex flex-wrap items-center gap-3">
        <SidebarTrigger className="-ml-2 md:hidden" />
        <h1 className={dense ? "min-w-0 text-base font-semibold wrap-break-word" : "min-w-0 text-xl font-semibold wrap-break-word"}>
          {title}
        </h1>
        {action}
      </div>
      {children ? <div className={dense ? "mt-2" : "mt-4 flex flex-col gap-4"}>{children}</div> : null}
    </header>
  );
}

export function ModuleBody({
  children,
  width = "reading",
  fill = false,
}: {
  children: ReactNode;
  width?: "reading" | "full";
  fill?: boolean;
}) {
  if (fill) {
    return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 md:px-6">
      <div className={width === "reading" ? "flex w-full max-w-2xl flex-col gap-6" : "flex min-w-0 flex-col gap-6"}>
        {children}
      </div>
    </div>
  );
}
