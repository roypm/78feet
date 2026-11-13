import type { Ref } from "react";
import { cn } from "cn";
import { SearchInput } from "@/components/ui/search-input";

export function MemberListSearch({
  ref,
  value,
  onChange,
  placeholder = "Buscar por nombre, DNI, teléfono o email…",
  className,
}: {
  ref?: Ref<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <SearchInput
      ref={ref}
      aria-label="Buscar en esta página"
      value={value}
      onValueChange={onChange}
      placeholder={placeholder}
      className={cn("w-full sm:max-w-md", className)}
    />
  );
}
