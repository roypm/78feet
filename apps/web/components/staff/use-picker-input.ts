"use client";

import { useEffect, useState, type InvalidEvent, type RefObject } from "react";
import { REQUIRED_FIELD_MESSAGE, suppressNativeInvalid } from "@/lib/ui/field-validity";

export type PickerInputProps = {
  label: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
};

export function usePickerInput({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  required,
  parse,
  format,
  validate,
  invalidMessage,
  inputRef,
}: PickerInputProps & {
  inputRef: RefObject<HTMLInputElement | null>;
  parse: (text: string) => string | undefined;
  format: (value: string) => string;
  validate?: (value: string) => string;
  invalidMessage: string;
}) {
  const [localValue, setLocalValue] = useState(defaultValue);
  const [draft, setDraft] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const value = controlledValue ?? localValue;
  const text = draft ?? format(value);
  const parsed = parse(text);
  const error = !text
    ? required ? REQUIRED_FIELD_MESSAGE : ""
    : !parsed ? invalidMessage : validate?.(parsed) ?? "";

  useEffect(() => { inputRef.current?.setCustomValidity(error); }, [error, inputRef]);

  useEffect(() => {
    const form = inputRef.current?.form;
    function reset() {
      setLocalValue(defaultValue);
      setDraft(null);
      setShowError(false);
    }
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [defaultValue, inputRef]);

  function commit(next: string) {
    if (controlledValue === undefined) setLocalValue(next);
    onValueChange?.(next);
  }

  return {
    value, text,
    error: showError ? error : "",
    changeText(next: string) {
      setDraft(next);
      const canonical = parse(next);
      if (!next) commit("");
      else if (canonical && !validate?.(canonical)) commit(canonical);
    },
    choose(next: string) {
      commit(next);
      setDraft(null);
      setShowError(false);
    },
    onBlur() {
      setShowError(true);
      if (!error) setDraft(null);
    },
    onInvalid(event: InvalidEvent<HTMLInputElement>) {
      setShowError(true);
      if (suppressNativeInvalid(event)) event.currentTarget.focus();
    },
  };
}
