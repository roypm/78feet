"use client";

import { useId, useRef, useState } from "react";
import { ClockIcon } from "lucide-react";
import { Field } from "@/components/staff/field";
import { TimeColumn } from "@/components/staff/time-column";
import { usePickerInput, type PickerInputProps } from "./use-picker-input";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { parseTimeInput } from "@/lib/ui/date-time";

export function TimePicker(props: PickerInputProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState("00");
  const [minute, setMinute] = useState("00");
  const field = usePickerInput({ ...props, inputRef, parse: parseTimeInput, format: (value) => value, invalidMessage: "Escribí una hora válida entre 00:00 y 23:59." });

  function openPicker(next: boolean) {
    if (next) {
      const [h, m] = (parseTimeInput(field.text) ?? "00:00").split(":");
      setHour(h);
      setMinute(m);
    }
    setOpen(next);
  }

  return (
    <Field label={props.label} htmlFor={id}>
      <input type="hidden" name={props.name} value={field.value} disabled={props.disabled} />
      <Popover open={open && !props.disabled} onOpenChange={openPicker}>
        <InputGroup className="h-11 sm:h-8">
          <InputGroupInput
            ref={inputRef} id={id} value={field.text} placeholder="HH:mm" inputMode="numeric"
            autoComplete="off" required={props.required} disabled={props.disabled} aria-label={props["aria-label"]}
            aria-invalid={Boolean(field.error)} aria-describedby={field.error ? `${id}-error` : undefined}
            onChange={(event) => field.changeText(event.target.value)} onBlur={field.onBlur} onInvalid={field.onInvalid}
            onKeyDown={(event) => { if (event.altKey && event.key === "ArrowDown") { event.preventDefault(); openPicker(true); } }}
          />
          <InputGroupAddon align="inline-end">
            <PopoverTrigger render={<InputGroupButton size="icon-sm" className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-8" disabled={props.disabled} aria-label={`Elegir hora: ${props["aria-label"] ?? props.label}`} />}>
              <ClockIcon />
            </PopoverTrigger>
          </InputGroupAddon>
        </InputGroup>
        <PopoverContent align="start" className="max-h-(--available-height) w-52 max-w-[calc(100vw-1rem)] gap-3 p-3">
          <PopoverTitle className="shrink-0">{props.label}</PopoverTitle>
          <div className="grid min-h-0 min-w-0 grid-cols-2 gap-3">
            <TimeColumn label="Hora" value={hour} onValueChange={setHour} count={24} disabled={props.disabled} />
            <TimeColumn label="Minutos" value={minute} onValueChange={setMinute} count={60} disabled={props.disabled} />
          </div>
          <Button type="button" className="min-h-11 sm:min-h-8" disabled={props.disabled} onClick={() => { field.choose(`${hour}:${minute}`); setOpen(false); }}>Aplicar hora</Button>
        </PopoverContent>
      </Popover>
      {field.error && <p id={`${id}-error`} className="text-sm text-destructive" role="alert">{field.error}</p>}
    </Field>
  );
}
