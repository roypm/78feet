import type { ReactNode } from "react";

export function ListSearchToolbar({
  children,
  filters,
  action,
}: {
  children?: ReactNode;
  filters?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      {children ? <div className="w-full min-w-0 sm:max-w-md sm:flex-1 sm:basis-80">{children}</div> : null}
      {filters ? <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">{filters}</div> : null}
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
