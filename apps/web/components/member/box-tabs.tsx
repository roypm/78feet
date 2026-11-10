import type { BoxSummary } from "@/lib/box/boxes";
import { ChoiceSelect, CHOICE_CHIP_MAX } from "@/components/member/choice-select";
import { FilterTabLink, FilterTabs } from "@/components/member/kind-tabs";

export function BoxTabs({
  boxes,
  boxId,
  hrefFor,
  includeAll = false,
  allHref,
  ariaLabel = "Sede",
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
  if (boxes.length === 0) return null;
  if (!includeAll && boxes.length <= 1) return null;

  const options = [
    ...(includeAll && allHref ? [{ value: "all", label: "Todos", href: allHref }] : []),
    ...boxes.map((box) => ({ value: box.id, label: box.name, href: hrefFor(box.id) })),
  ];
  const active = includeAll && !boxId ? "all" : (boxId ?? boxes[0]?.id ?? "");

  if (boxes.length > CHOICE_CHIP_MAX) {
    return <ChoiceSelect label={ariaLabel} value={active} options={options} />;
  }

  const allActive = includeAll && !boxId;
  return (
    <FilterTabs aria-label={ariaLabel} className="max-w-none shrink-0">
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
