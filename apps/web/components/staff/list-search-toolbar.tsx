import type { ReactNode } from "react";

export function ListSearchToolbar({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      <div className="w-full min-w-0 sm:max-w-md sm:flex-1 sm:basis-80">{children}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
