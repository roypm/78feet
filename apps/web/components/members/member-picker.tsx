import { useEffect, useId, useMemo, useRef, useState, type InvalidEvent } from "react";
import { cn } from "cn";
import { SearchInput } from "@/components/ui/search-input";
import { Field } from "@/components/common/forms/field";
import { normalizeMemberSearch } from "@/lib/staff/member-search";
import { REQUIRED_FIELD_MESSAGE, suppressNativeInvalid } from "@/lib/ui/field-validity";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/feedback/empty-state";

export function MemberPicker({
  members,
  value,
  onChange,
  disabled,
  required = false,
}: {
  members: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const searchId = useId();
  const errorId = `${searchId}-error`;
  const searchRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const needle = normalizeMemberSearch(query);
  const filtered = useMemo(() => {
    if (!needle) return members;
    return members.filter((member) => normalizeMemberSearch(member.name).includes(needle));
  }, [members, needle]);
  const validityError = required && !value ? REQUIRED_FIELD_MESSAGE : "";

  useEffect(() => {
    hiddenRef.current?.setCustomValidity(validityError);
  }, [validityError]);

  function clearQuery() {
    setQuery("");
    searchRef.current?.focus({ preventScroll: true });
  }

  function choose(id: string) {
    onChange(id);
    setError("");
  }

  function onInvalid(event: InvalidEvent<HTMLInputElement>) {
    const first = suppressNativeInvalid(event);
    setError(validityError || REQUIRED_FIELD_MESSAGE);
    if (first) searchRef.current?.focus();
  }

  return (
    <Field label="Socio" htmlFor={searchId} invalid={Boolean(error)} disabled={disabled} error={error} errorId={errorId}>
      <div className="relative">
        <input
          ref={hiddenRef}
          tabIndex={-1}
          className="pointer-events-none absolute inset-0 opacity-0"
          value={value}
          required={required}
          disabled={disabled}
          aria-hidden="true"
          onChange={() => undefined}
          onInvalid={onInvalid}
        />
        <SearchInput
          ref={searchRef} id={searchId}
          placeholder="Buscar por nombre…"
          value={query}
          onValueChange={setQuery}
          disabled={disabled}
          className="mb-2"
          aria-label="Buscar socio por nombre"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : undefined}
        />
      </div>
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
                onClick={() => choose(member.id)}
              >
                <span className="min-w-0 truncate">{member.name}</span>
              </button>
            );
          })}
      </div>}
    </Field>
  );
}
