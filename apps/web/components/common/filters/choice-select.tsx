"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const CHOICE_CHIP_MAX = 3;

export type ChoiceOption = { value: string; label: string; href: string };

export function ChoiceSelect({
  label,
  value,
  options,
}: {
  label: string;
  value: string;
  options: readonly ChoiceOption[];
}) {
  const router = useRouter();
  const items = options.map((option) => ({ value: option.value, label: option.label }));

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next == null || next === value) return;
        const option = options.find((item) => item.value === next);
        if (option) router.push(option.href);
      }}
    >
      <SelectTrigger aria-label={label} className="min-h-11 w-fit max-w-56 min-w-36 sm:min-h-8">
        <SelectValue>
          {(selected) => (
            <span className="min-w-0 truncate">{options.find((option) => option.value === selected)?.label}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
