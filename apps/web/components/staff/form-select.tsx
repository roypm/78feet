"use client";

import { useEffect, useId, useRef, useState, type InvalidEvent, type ReactNode } from "react";
import { Field } from "@/components/staff/field";
import { REQUIRED_FIELD_MESSAGE, suppressNativeInvalid } from "@/lib/ui/field-validity";
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
  labelClassName,
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
  labelClassName?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  // Native single selects fall back to their first option when no default matches.
  const initialValue = options.some((option) => option.value === defaultValue)
    ? defaultValue
    : options[0]?.value ?? "";
  const [uncontrolled, setUncontrolled] = useState(initialValue ?? "");
  const current = value ?? uncontrolled;
  const validityError = required && !current ? REQUIRED_FIELD_MESSAGE : "";

  useEffect(() => {
    hiddenRef.current?.setCustomValidity(validityError);
  }, [validityError]);

  useEffect(() => {
    const form = hiddenRef.current?.form;
    function reset() {
      setUncontrolled(initialValue ?? "");
      setError("");
    }
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [initialValue]);

  function choose(next: string) {
    if (value === undefined) setUncontrolled(next);
    onValueChange?.(next);
    setError("");
  }

  function onInvalid(event: InvalidEvent<HTMLInputElement>) {
    const first = suppressNativeInvalid(event);
    setError(validityError || REQUIRED_FIELD_MESSAGE);
    if (first) document.getElementById(id)?.focus();
  }

  return (
    <Field label={label} htmlFor={id} invalid={Boolean(error)} disabled={disabled} error={error} errorId={errorId} labelClassName={labelClassName}>
      <div className="relative">
        <input
          ref={hiddenRef}
          tabIndex={-1}
          className="pointer-events-none absolute inset-0 opacity-0"
          value={current}
          required={required}
          disabled={disabled}
          aria-hidden="true"
          onChange={() => undefined}
          onInvalid={onInvalid}
        />
        <Select
          items={options}
          name={name}
          value={value}
          defaultValue={initialValue}
          onValueChange={(next) => { if (next !== null) choose(next); }}
          disabled={disabled}
        >
          <SelectTrigger
            id={id}
            className="min-h-11 w-full min-w-0 sm:min-h-8"
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? errorId : undefined}
          >
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
      </div>
      {children}
    </Field>
  );
}
