import type { BoxSummary } from "@/lib/box/boxes";
import { QueryFilter } from "@/components/common/filters/query-filter";

export function BoxTabs({
  boxes,
  boxId,
  hrefFor,
  includeAll = false,
  allHref,
  ariaLabel = "Sede",
  forceSelect = false,
}: {
  boxes: readonly BoxSummary[];
  /** Sede activa; omitir cuando `includeAll` y vista «Todos». */
  boxId?: string;
  hrefFor: (slug: string) => string;
  /** Muestra «Todos» (Impagos, Cobros registrados). */
  includeAll?: boolean;
  allHref?: string;
  ariaLabel?: string;
  /** Renders this list filter as a dropdown when the filter is shown. */
  forceSelect?: boolean;
}) {
  if (boxes.length === 0) return null;
  if (!includeAll && boxes.length <= 1) return null;

  const options = [
    ...(includeAll && allHref ? [{ value: "all", label: "Todos", href: allHref }] : []),
    ...boxes.map((box) => ({ value: box.id, label: box.name, href: hrefFor(box.slug) })),
  ];
  const active = includeAll && !boxId ? "all" : (boxId ?? boxes[0]?.id ?? "");

  return <QueryFilter ariaLabel={ariaLabel} options={options} active={active} chipCount={boxes.length} forceSelect={forceSelect} />;
}
