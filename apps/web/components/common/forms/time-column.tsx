"use client";

import { useId, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";

export function TimeColumn({ label, value, count, onValueChange, disabled }: {
  label: string;
  value: string;
  count: number;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) {
  const labelId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    const selected = list?.querySelector<HTMLElement>('[role="radio"][data-checked]');
    if (!list || !selected) return;
    // Scroll only this column; scrollIntoView could also move the form behind it.
    list.scrollTop += selected.getBoundingClientRect().top - list.getBoundingClientRect().top
      - (list.clientHeight - selected.offsetHeight) / 2;
  }, [value]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled || !["Home", "End", "PageUp", "PageDown"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? count - 1
      : Math.max(0, Math.min(count - 1, Number(value) + (event.key === "PageUp" ? -5 : 5)));
    const nextValue = String(next).padStart(2, "0");
    onValueChange(nextValue);
    listRef.current?.querySelector<HTMLButtonElement>(`[data-value="${nextValue}"]`)?.focus({ preventScroll: true });
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-1.5">
      <span id={labelId} className="shrink-0 text-center text-sm font-medium text-muted-foreground">{label}</span>
      <RadioGroup
        ref={listRef} aria-labelledby={labelId} value={value} onValueChange={onValueChange} disabled={disabled}
        onKeyDown={onKeyDown} className="time-column relative flex h-55 min-h-0 flex-col overflow-y-auto overscroll-contain sm:h-45"
      >
        {Array.from({ length: count }, (_, index) => {
          const option = String(index).padStart(2, "0");
          return (
            <Radio.Root
              key={option} value={option} data-value={option} nativeButton render={<button type="button" />}
              className="flex h-11 shrink-0 touch-manipulation cursor-pointer items-center justify-center rounded-md text-base font-medium tabular-nums outline-none select-none pointer-hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-checked:bg-primary data-checked:pointer-hover:bg-primary data-checked:text-primary-foreground data-disabled:cursor-not-allowed data-disabled:opacity-50 sm:h-9 sm:text-sm"
            >
              {option}
            </Radio.Root>
          );
        })}
      </RadioGroup>
    </div>
  );
}
