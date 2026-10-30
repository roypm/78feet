"use client";

import { Input } from "@/components/ui/input";
import { controlClass } from "@/components/staff/field";
import { cn } from "cn";

export function MemberListSearch({
  value,
  onChange,
  placeholder = "Buscar por nombre, DNI, teléfono o email…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Input
      type="search"
      aria-label="Buscar en esta página"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={cn(controlClass, "min-h-11", className)}
      autoComplete="off"
      enterKeyHint="search"
    />
  );
}
