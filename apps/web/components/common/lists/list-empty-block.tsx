import type { ReactNode } from "react";
import { EmptyState } from "@/components/common/feedback/empty-state";

/** Vacío de listado staff: filtros arriba y bloque a ancho de listado. */
export function ListEmptyBlock({
  filters,
  title,
  description,
  href,
  action,
  children,
}: {
  filters?: ReactNode;
  title: string;
  description?: ReactNode;
  href?: string;
  action?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-3">
      {filters}
      <EmptyState layout="panel" title={title} description={description} href={href} action={action}>
        {children}
      </EmptyState>
    </div>
  );
}
