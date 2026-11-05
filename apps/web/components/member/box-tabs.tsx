import type { BoxSummary } from "@/lib/box/boxes";
import { FilterTabLink, FilterTabs } from "@/components/member/kind-tabs";

export function BoxTabs({
  boxes,
  boxId,
  hrefFor,
  includeAll = false,
  allHref,
  ariaLabel = "Box",
}: {
  boxes: readonly BoxSummary[];
  /** Sede activa; omitir cuando `includeAll` y vista «Todos». */
  boxId?: string;
  hrefFor: (id: string) => string;
  /** Muestra «Todos» (Impagos, Cobros registrados). */
  includeAll?: boolean;
  allHref?: string;
  ariaLabel?: string;
}) {
  if (boxes.length === 0 && !includeAll) return null;
  const allActive = includeAll && !boxId;
  return (
    <FilterTabs aria-label={ariaLabel}>
      {includeAll && allHref ? (
        <FilterTabLink href={allHref} active={allActive}>
          Todos
        </FilterTabLink>
      ) : null}
      {boxes.map((box) => (
        <FilterTabLink key={box.id} href={hrefFor(box.id)} active={!allActive && box.id === boxId}>
          {box.name}
        </FilterTabLink>
      ))}
    </FilterTabs>
  );
}
