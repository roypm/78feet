"use client";

import { useEffect, useId, useRef, useState, type InvalidEvent } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import { Field } from "@/components/staff/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { formatEuroCents, parseEuroCents, parseQuantity } from "@/lib/ui/numbers";

type CommonProps = {
  label: string;
  name: string;
  required?: boolean;
  disabled?: boolean;
};

export function QuantityField({ defaultValue, min = 0, ...props }: CommonProps & { defaultValue?: number; min?: number }) {
  return <NumericField {...props} kind="quantity" min={min} initialText={defaultValue === undefined ? "" : String(defaultValue)} />;
}

export function MoneyField({ defaultCents, ...props }: CommonProps & { defaultCents?: number }) {
  return <NumericField {...props} kind="money" min={0} initialText={defaultCents === undefined ? "" : formatEuroCents(defaultCents)} />;
}

function NumericField({ label, name, required = false, disabled = false, kind, min, initialText }: CommonProps & {
  kind: "quantity" | "money";
  min: number;
  initialText: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(initialText);
  const [showError, setShowError] = useState(false);
  const quantity = kind === "quantity";
  const parsed = quantity ? parseQuantity(text) : parseEuroCents(text);
  const error = !text.trim()
    ? required ? "Este campo es obligatorio." : ""
    : parsed === null
      ? quantity ? "Escribí un número entero válido." : "Escribí un importe válido con hasta dos decimales."
      : parsed < min ? `El mínimo es ${min}.` : "";
  const serialized = parsed === null || error ? "" : quantity ? String(parsed) : formatEuroCents(parsed, ".");
  const invalid = showError && Boolean(error);
  const canDecrease = parsed !== null && parsed > min;
  const canIncrease = !text.trim() || parsed !== null && parsed < Number.MAX_SAFE_INTEGER;

  useEffect(() => { inputRef.current?.setCustomValidity(error); }, [error]);

  useEffect(() => {
    const form = inputRef.current?.form;
    function reset() { setText(initialText); setShowError(false); }
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [initialText]);

  function normalize() {
    setShowError(true);
    if (parsed !== null && !error) setText(quantity ? String(parsed) : formatEuroCents(parsed));
  }

  function step(direction: 1 | -1) {
    if (disabled || direction === 1 && !canIncrease || direction === -1 && !canDecrease) return;
    const next = parsed === null ? min : Math.max(min, parsed + direction);
    setText(String(next));
    setShowError(false);
  }

  function onInvalid(event: InvalidEvent<HTMLInputElement>) {
    event.preventDefault();
    setShowError(true);
    const input = event.currentTarget;
    if (input.form?.querySelector("input:invalid") === input) input.focus();
  }

  return (
    <Field label={label} htmlFor={id} invalid={invalid} disabled={disabled}>
      <input type="hidden" name={name} value={serialized} disabled={disabled} />
      <InputGroup className="h-11 sm:h-8">
        {quantity && (
          <InputGroupAddon align="inline-start">
            <InputGroupButton
              size="icon-sm" className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-8"
              aria-label={`Disminuir ${label}`} aria-controls={id} disabled={disabled || !canDecrease}
              onClick={() => step(-1)}
            ><MinusIcon /></InputGroupButton>
          </InputGroupAddon>
        )}
        <InputGroupInput
          ref={inputRef} id={id} value={text} required={required} disabled={disabled} autoComplete="off"
          inputMode={quantity ? "numeric" : "decimal"} role={quantity ? "spinbutton" : undefined}
          aria-valuemin={quantity ? min : undefined} aria-valuenow={quantity && parsed !== null ? parsed : undefined}
          aria-invalid={invalid} aria-describedby={invalid ? `${id}-error` : undefined}
          className={quantity ? "text-center tabular-nums" : "tabular-nums"}
          onChange={(event) => setText(event.target.value)} onBlur={normalize} onInvalid={onInvalid}
          onKeyDown={(event) => {
            if (quantity && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
              event.preventDefault();
              step(event.key === "ArrowUp" ? 1 : -1);
            }
          }}
        />
        <InputGroupAddon align="inline-end">
          {quantity ? (
            <InputGroupButton
              size="icon-sm" className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-8"
              aria-label={`Aumentar ${label}`} aria-controls={id} disabled={disabled || !canIncrease}
              onClick={() => step(1)}
            ><PlusIcon /></InputGroupButton>
          ) : <InputGroupText aria-hidden="true">€</InputGroupText>}
        </InputGroupAddon>
      </InputGroup>
      {invalid && <p id={`${id}-error`} className="text-sm text-destructive" role="alert">{error}</p>}
    </Field>
  );
}
