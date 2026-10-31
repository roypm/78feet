"use client";

import { useId, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { SearchInput } from "@/components/ui/search-input";
import { Field } from "@/components/staff/field";
import { normalizeMemberSearch } from "@/lib/staff/member-search";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";

export function MemberPicker({
  members,
  value,
  onChange,
  disabled,
}: {
  members: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const searchId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const needle = normalizeMemberSearch(query);
  const filtered = useMemo(() => {
    if (!needle) return members;
    return members.filter((member) => normalizeMemberSearch(member.name).includes(needle));
  }, [members, needle]);

  function clearQuery() {
    setQuery("");
    searchRef.current?.focus({ preventScroll: true });
  }

  return (
    <Field label="Socio" htmlFor={searchId} disabled={disabled}>
      <SearchInput
        ref={searchRef} id={searchId}
        placeholder="Buscar por nombre…"
        value={query}
        onValueChange={setQuery}
        disabled={disabled}
        className="mb-2"
        aria-label="Buscar socio por nombre"
      />
      {filtered.length === 0 ? (
        <EmptyState compact title={members.length === 0 ? "No hay socios disponibles" : "Ningún socio coincide con la búsqueda"} description={members.length === 0 ? "No quedan socios para añadir a esta clase." : "Probá con otro nombre o limpiá la búsqueda."}>
          {query && <Button type="button" variant="outline" className="min-h-11" disabled={disabled} onClick={clearQuery}>Limpiar búsqueda</Button>}
        </EmptyState>
      ) : <div
        className="max-h-52 overflow-y-auto rounded-lg border border-input bg-background"
        role="listbox"
        aria-label="Socios disponibles"
      >
        {filtered.map((member) => {
            const selected = value === member.id;
            return (
              <button
                key={member.id}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                className={cn(
                  "flex w-full min-h-11 items-center px-3 py-2 text-left text-sm transition-colors",
                  "pointer-hover:bg-muted/80 active:bg-muted",
                  selected && "bg-muted font-medium",
                )}
                onClick={() => onChange(member.id)}
              >
                <span className="min-w-0 truncate">{member.name}</span>
              </button>
            );
          })}
      </div>}
    </Field>
  );
}
