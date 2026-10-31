"use client";

import { useId, type ReactNode } from "react";
import { Field } from "@/components/staff/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SelectOption = { value: string; label: string };

export function FormSelect({
  label,
  options,
  name,
  value,
  defaultValue,
  onValueChange,
  required = false,
  disabled = false,
  placeholder = "Seleccionar…",
  children,
}: {
  label: string;
  options: SelectOption[];
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  children?: ReactNode;
}) {
  const id = useId();
  // Native single selects fall back to their first option when no default matches.
  const initialValue = options.some((option) => option.value === defaultValue)
    ? defaultValue
    : options[0]?.value ?? null;

  return (
    <Field label={label} htmlFor={id}>
      <Select
        items={options}
        name={name}
        value={value}
        defaultValue={initialValue}
        onValueChange={(next) => { if (next !== null) onValueChange?.(next); }}
        required={required}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="min-h-11 w-full min-w-0 sm:min-h-8">
          <SelectValue>
            {(selected) => (
              <span className="min-w-0 truncate">
                {options.find((option) => option.value === selected)?.label ?? placeholder}
              </span>
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
      {children}
    </Field>
  );
}
