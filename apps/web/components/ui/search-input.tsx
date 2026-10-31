"use client";

import { useImperativeHandle, useRef, type ComponentProps } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

type SearchInputProps = Omit<ComponentProps<"input">, "type" | "value" | "defaultValue" | "onChange" | "size" | "children"> & {
  value: string;
  onValueChange: (value: string) => void;
  "aria-label": string;
  clearLabel?: string;
};

export function SearchInput({ ref, value, onValueChange, disabled, readOnly, className, onKeyDown, clearLabel = "Borrar búsqueda", ...props }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current!, []);

  function clear() {
    if (disabled || readOnly) return;
    onValueChange("");
    inputRef.current?.focus({ preventScroll: true });
  }

  return (
    <InputGroup className={cn("h-11", className)}>
      <InputGroupAddon align="inline-start" aria-hidden="true"><SearchIcon /></InputGroupAddon>
      <InputGroupInput
        autoComplete="off" enterKeyHint="search" {...props}
        ref={inputRef} data-search-input="" type="search" value={value} disabled={disabled} readOnly={readOnly}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (!event.defaultPrevented && !event.nativeEvent.isComposing && event.key === "Escape" && value && !disabled && !readOnly) {
            event.preventDefault();
            event.stopPropagation();
            clear();
          }
        }}
      />
      {value.length > 0 && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton type="button" size="icon-sm" className="min-h-11 min-w-11" aria-label={clearLabel}
            disabled={disabled || readOnly} onClick={clear}>
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
