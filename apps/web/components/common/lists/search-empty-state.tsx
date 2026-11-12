"use client";

import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { Button } from "@/components/ui/button";

export function SearchEmptyState({
  title = "No hay coincidencias en esta página",
  onClear,
}: {
  title?: string;
  onClear: () => void;
}) {
  return (
    <ListEmptyBlock title={title}>
      <Button type="button" variant="outline" className="min-h-11" onClick={onClear}>
        Limpiar búsqueda
      </Button>
    </ListEmptyBlock>
  );
}
