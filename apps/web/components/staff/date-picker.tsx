"use client";

import { useId, useRef, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { es } from "react-day-picker/locale";
import { localDateString } from "@78feet/domain";
import { Field } from "@/components/staff/field";
import { usePickerInput, type PickerInputProps } from "./use-picker-input";
import { Calendar } from "@/components/ui/calendar";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { dateFromValue, dateToValue, formatDateValue, parseDateInput } from "@/lib/ui/date-time";

export function DatePicker({ min, ...props }: PickerInputProps & { min?: string }) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>();
  const field = usePickerInput({
    ...props,
    inputRef,
    parse: parseDateInput,
    format: formatDateValue,
    validate: (value) => min && value < min ? `Elegí una fecha desde el ${formatDateValue(min)}.` : "",
    invalidMessage: "Escribí una fecha válida con formato DD/MM/AAAA.",
  });
  const selected = dateFromValue(field.value);
  const minimum = min ? dateFromValue(min) : undefined;

  return (
    <Field label={props.label} htmlFor={id} invalid={Boolean(field.error)} disabled={props.disabled} error={field.error} errorId={`${id}-error`}>
      <input type="hidden" name={props.name} value={field.value} disabled={props.disabled} />
      <Popover open={open && !props.disabled} onOpenChange={(next) => {
        if (next) setMonth(selected ?? minimum ?? dateFromValue(localDateString(new Date())));
        setOpen(next);
      }}>
        <InputGroup className="h-11 sm:h-8">
          <InputGroupInput
            ref={inputRef} id={id} value={field.text} placeholder="DD/MM/AAAA" inputMode="numeric"
            autoComplete="off" required={props.required} disabled={props.disabled} aria-label={props["aria-label"]}
            aria-invalid={Boolean(field.error)} aria-describedby={field.error ? `${id}-error` : undefined}
            onChange={(event) => field.changeText(event.target.value)} onBlur={field.onBlur} onInvalid={field.onInvalid}
            onKeyDown={(event) => { if (event.altKey && event.key === "ArrowDown") { event.preventDefault(); setMonth(selected ?? minimum); setOpen(true); } }}
          />
          <InputGroupAddon align="inline-end">
            <PopoverTrigger render={<InputGroupButton size="icon-sm" className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-8" disabled={props.disabled} aria-label={`Abrir calendario: ${props["aria-label"] ?? props.label}`} />}>
              <CalendarIcon />
            </PopoverTrigger>
          </InputGroupAddon>
        </InputGroup>
        <PopoverContent align="start" className="w-auto max-w-[calc(100vw-1rem)] p-0">
          <PopoverTitle className="sr-only">{props.label}</PopoverTitle>
          <Calendar
            mode="single" required locale={es} weekStartsOn={1} selected={selected} month={month} onMonthChange={setMonth}
            disabled={minimum ? { before: minimum } : undefined} startMonth={minimum}
            autoFocus
            onSelect={(date) => { field.choose(dateToValue(date)); setOpen(false); }}
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}
