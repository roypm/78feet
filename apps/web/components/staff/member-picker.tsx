"use client";

import { useMemo, useState } from "react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Field, controlClass } from "@/components/staff/field";
import { normalizeMemberSearch } from "@/lib/staff/member-search";

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
  const [query, setQuery] = useState("");
  const needle = normalizeMemberSearch(query);
  const filtered = useMemo(() => {
    if (!needle) return members;
    return members.filter((member) => normalizeMemberSearch(member.name).includes(needle));
  }, [members, needle]);

  return (
    <Field label="Socio">
      <Input
        type="search"
        placeholder="Buscar por nombre…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        disabled={disabled}
        className={cn(controlClass, "mb-2")}
        autoComplete="off"
        enterKeyHint="search"
      />
      <div
        className="max-h-52 overflow-y-auto rounded-lg border border-input bg-background"
        role="listbox"
        aria-label="Socios disponibles"
      >
        {filtered.length === 0 ? (
          <p className="px-3 py-2.5 text-sm text-muted-foreground">Ningún socio coincide con la búsqueda.</p>
        ) : (
          filtered.map((member) => {
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
                  "hover:bg-muted/80 active:bg-muted",
                  selected && "bg-muted font-medium",
                )}
                onClick={() => onChange(member.id)}
              >
                <span className="min-w-0 truncate">{member.name}</span>
              </button>
            );
          })
        )}
      </div>
    </Field>
  );
}
