"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { Field } from "@/components/common/forms/field";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listOptionsHref, type ListFilter, type ListOption } from "@/lib/box/list-sorting";

type Props = { path: string; filters: readonly ListFilter[]; order: string; sortOptions: readonly ListOption[] };

function OptionField({ label, value, options, onChange }: {
  label: string; value: string; options: readonly ListOption[]; onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} labelClassName="font-normal text-muted-foreground">
      <Select items={options} value={value} onValueChange={(next) => { if (next !== null) onChange(next); }}>
        <SelectTrigger id={id} className="min-h-11 w-full min-w-0 sm:min-h-8">
          <SelectValue>{(selected) => <span className="min-w-0 truncate">{options.find((option) => option.value === selected)?.label}</span>}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          <SelectGroup>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function OptionsForm({ filters, order, sortOptions, apply }: Omit<Props, "path"> & {
  apply: (values: Record<string, string>, sort: string) => void;
}) {
  const [values, setValues] = useState(() => Object.fromEntries(filters.map((filter) => [filter.key, filter.value])));
  const [sort, setSort] = useState(order);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    apply(values, sort);
  }
  return (
    <form onSubmit={submit} className="flex min-h-0 min-w-0 flex-col">
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain p-4">
        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className="sr-only">Filtros</legend>
          {filters.map((filter) => <OptionField key={filter.key} label={filter.label} value={values[filter.key]}
            options={filter.options} onChange={(next) => setValues((previous) => ({ ...previous, [filter.key]: next }))} />)}
        </fieldset>
        <Separator />
        <OptionField label="Ordenar por" value={sort} options={sortOptions} onChange={setSort} />
      </div>
      <Separator className="shrink-0" />
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2">
        <Button type="button" variant="ghost" className="min-h-11 sm:min-h-8"
          onClick={() => apply(Object.fromEntries(filters.map((filter) => [filter.key, "todos"])), sortOptions[0].value)}>Restablecer</Button>
        <Button type="submit" className="min-h-11 sm:min-h-8">Aplicar</Button>
      </div>
    </form>
  );
}

export function ListOptions({ path, filters, order, sortOptions }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const activeCount = filters.filter((filter) => filter.value && filter.value !== "todos").length;
  function apply(values: Record<string, string>, sort: string) {
    setOpen(false);
    startTransition(() => router.push(listOptionsHref(path, values, sort, sortOptions[0].value), { scroll: false }));
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button type="button" variant="outline" className="min-h-11" disabled={pending} aria-busy={pending} />}>
        {pending ? <Spinner /> : <SlidersHorizontalIcon data-icon="inline-start" />}
        Filtrar y ordenar
        {activeCount > 0 ? <Badge variant="secondary" aria-label={activeCount === 1 ? "1 filtro activo" : `${activeCount} filtros activos`}>{activeCount}</Badge> : null}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] max-h-[min(36rem,80dvh)] gap-0 overflow-hidden p-0">
        <PopoverTitle className="sr-only">Filtrar y ordenar</PopoverTitle>
        <OptionsForm key={`${open}:${order}:${filters.map((filter) => filter.value).join(":")}`}
          filters={filters} order={order} sortOptions={sortOptions} apply={apply} />
      </PopoverContent>
    </Popover>
  );
}
