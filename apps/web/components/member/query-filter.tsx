import { ChoiceSelect, CHOICE_CHIP_MAX, type ChoiceOption } from "@/components/member/choice-select";
import { FilterTabLink, FilterTabs } from "@/components/member/kind-tabs";

/** Chips si hay hasta 3 opciones reales; a partir de 4, un selector. */
export function QueryFilter({
  ariaLabel,
  options,
  active,
  chipCount,
}: {
  ariaLabel: string;
  options: readonly ChoiceOption[];
  active: string;
  chipCount: number;
}) {
  if (options.length === 0) return null;
  if (chipCount > CHOICE_CHIP_MAX) {
    return <ChoiceSelect label={ariaLabel} value={active} options={options} />;
  }
  return (
    <FilterTabs aria-label={ariaLabel} className="max-w-none shrink-0">
      {options.map((option) => (
        <FilterTabLink key={option.value} href={option.href} active={option.value === active}>
          {option.label}
        </FilterTabLink>
      ))}
    </FilterTabs>
  );
}
