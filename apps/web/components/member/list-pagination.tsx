import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PageInfo } from "@/lib/box/pagination";

export function ListPagination({ pageInfo, path, filters = {} }: {
  pageInfo: PageInfo; path: string; filters?: Record<string, string | undefined>;
}) {
  const { page, pageSize, total, totalPages } = pageInfo;
  if (total === 0) return null;
  function href(target: number) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
    if (target > 1) query.set("pagina", String(target));
    return query.size ? `${path}?${query}` : path;
  }
  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-3 py-3">
      <p className="text-sm text-muted-foreground">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {page > 1 ? <Button nativeButton={false} variant="outline" className="min-h-11" render={<Link href={href(page - 1)} />}>Anterior</Button>
          : <Button variant="outline" className="min-h-11" disabled>Anterior</Button>}
        <span className="text-sm" aria-current="page">Página {page} de {totalPages}</span>
        {page < totalPages ? <Button nativeButton={false} variant="outline" className="min-h-11" render={<Link href={href(page + 1)} />}>Siguiente</Button>
          : <Button variant="outline" className="min-h-11" disabled>Siguiente</Button>}
      </div>
    </nav>
  );
}
