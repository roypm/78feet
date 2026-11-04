import type { BoxSummary } from "@/lib/box/boxes";
import { FilterTabLink, FilterTabs } from "@/components/member/kind-tabs";

export function BoxTabs({
  boxes,
  boxId,
  hrefFor,
}: {
  boxes: readonly BoxSummary[];
  boxId: string;
  hrefFor: (id: string) => string;
}) {
  if (boxes.length === 0) return null;
  return (
    <FilterTabs aria-label="Box">
      {boxes.map((box) => (
        <FilterTabLink key={box.id} href={hrefFor(box.id)} active={box.id === boxId}>
          {box.name}
        </FilterTabLink>
      ))}
    </FilterTabs>
  );
}
