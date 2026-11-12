"use client";

import { FormActions } from "@/components/common/forms/form-actions";


import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";

import { useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import {
  billingPeriodKindLabel,
  consumptionModelLabel,
  formatPeriodicQuotaIncludes,
  formatQuotaLimit,
  quotaPeriodForConsumption,
  usesPeriodicQuota,
  type TariffBilling,
  type TariffConsumption,
} from "@78feet/domain";
import { api } from "@/lib/box/api";
import type { TariffView } from "@/lib/box/tariffs";
import { formatPrice } from "@/lib/box/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/common/forms/form-control";
import { MoneyField, QuantityField } from "@/components/common/forms/numeric-field";
import { parseEuroCents } from "@/lib/ui/numbers";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Field } from "@/components/common/forms/field";
import { FormSelect } from "@/components/common/forms/form-select";
import { FormDialog } from "@/components/common/dialogs/form-dialog";
import { ConfirmDialog } from "@/components/common/dialogs/confirm-dialog";
import { ModulePrimaryAction } from "@/components/common/layout/module-page";
import { cn } from "cn";

const SUBSCRIPTION_BILLING: TariffBilling[] = ["monthly", "quarterly", "semiannual", "annual", "none"];

function parseQuotaLimit(form: FormData, name: string): number | null {
  const raw = String(form.get(name) ?? "");
  if (raw === "unlimited") return null;
  return Number(raw);
}

function QuotaLimitField({
  label,
  name,
  defaultValue,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue?: number | null;
  disabled?: boolean;
}) {
  const [unlimited, setUnlimited] = useState(defaultValue === null);
  return (
    <div className="flex flex-col gap-2">
      <FormSelect
        label={label}
        disabled={disabled}
        value={unlimited ? "unlimited" : "number"}
        onValueChange={(value) => setUnlimited(value === "unlimited")}
        options={[
          { value: "number", label: "Número" },
          { value: "unlimited", label: "Ilimitadas" },
        ]}
      />
      {unlimited ? (
        <input type="hidden" name={name} value="unlimited" />
      ) : (
        <QuantityField
          label={`Cuántas ${label.split(" / ")[0]!.toLowerCase()}`}
          name={name}
          min={0}
          required
          defaultValue={defaultValue ?? undefined}
          disabled={disabled}
        />
      )}
    </div>
  );
}

function TariffDialogForm({
  tariff,
  open,
  onOpenChange,
}: {
  tariff: TariffView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [consumptionModel, setConsumptionModel] = useState<TariffConsumption | "">(
    tariff?.consumptionModel ?? "",
  );
  const [billingPeriod, setBillingPeriod] = useState<TariffBilling | "">(
    tariff?.billingPeriod ?? "",
  );

  const editing = tariff !== null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const priceCents = parseEuroCents(String(form.get("price") ?? ""));
    if (priceCents === null) return;

    const effectiveConsumption = editing ? tariff.consumptionModel : consumptionModel;
    const effectiveBilling = editing ? tariff.billingPeriod : billingPeriod;
    if (!effectiveConsumption) return;
    if (effectiveConsumption !== "pack" && !effectiveBilling) return;

    const body = {
      name: String(form.get("name")),
      consumptionModel: effectiveConsumption,
      billingPeriod: effectiveBilling,
      priceCents,
      quotaDirected: usesPeriodicQuota(effectiveConsumption) ? parseQuotaLimit(form, "quotaDirected") : 0,
      quotaOpen: usesPeriodicQuota(effectiveConsumption) ? parseQuotaLimit(form, "quotaOpen") : 0,
      packClasses: effectiveConsumption === "pack" ? Number(form.get("packClasses")) : null,
    };

    if (!begin()) return;
    try {
      if (editing) {
        await api(`/api/v1/admin/tariffs/${tariff.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast.success("Tarifa actualizada");
      } else {
        await api("/api/v1/admin/tariffs", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success("Tarifa creada");
        formElement.reset();
        setConsumptionModel("");
        setBillingPeriod("");
      }
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : editing ? "No se pudo guardar" : "No se pudo crear");
    } finally {
      setPending(false);
    }
  }

  const effectiveConsumption = editing ? tariff.consumptionModel : consumptionModel;
  const hasPeriodicConsumption = effectiveConsumption !== "" && usesPeriodicQuota(effectiveConsumption);

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
      busy={pending}
      title={editing ? "Editar tarifa" : "Nueva tarifa"}
      description={
        editing
          ? "Actualizá precio y cupos. Consumo y facturación no se cambian."
          : "Nombre, cupos, consumo, facturación y precio."
      }
    >
      <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
        <fieldset disabled={pending} aria-busy={pending} className="contents">
          <FormInput label="Nombre" name="name" required defaultValue={tariff?.name ?? ""} />
          {editing ? (
            <Field label="Consumo">
              <p className="text-sm text-muted-foreground">{consumptionModelLabel(tariff.consumptionModel)}</p>
            </Field>
          ) : (
            <FormSelect
              label="Consumo"
              name="consumptionModel"
              required
              disabled={pending}
              value={consumptionModel}
              onValueChange={(value) => {
                const next = value as TariffConsumption | "";
                setConsumptionModel(next);
                if (next === "pack") setBillingPeriod("one_time");
                else setBillingPeriod("");
              }}
              options={[
                { value: "", label: "Elegí un tipo de consumo…" },
                { value: "weekly_quota", label: "Cupo semanal" },
                { value: "monthly_quota", label: "Cupo mensual" },
                { value: "pack", label: "Bono" },
              ]}
            />
          )}
          {hasPeriodicConsumption ? (
            <>
              <QuotaLimitField
                label={`Dirigidas / ${quotaPeriodForConsumption(effectiveConsumption as TariffConsumption) === "month" ? "mes" : "semana"}`}
                name="quotaDirected"
                defaultValue={tariff?.quotaDirected}
                disabled={pending}
              />
              <QuotaLimitField
                label={`Opens / ${quotaPeriodForConsumption(effectiveConsumption as TariffConsumption) === "month" ? "mes" : "semana"}`}
                name="quotaOpen"
                defaultValue={tariff?.quotaOpen}
                disabled={pending}
              />
            </>
          ) : effectiveConsumption === "pack" ? (
            <QuantityField label="Clases del bono" name="packClasses" min={1} required defaultValue={tariff?.packClasses ?? undefined} disabled={pending} />
          ) : null}
          {editing ? (
            <Field label="Facturación">
              <p className="text-sm text-muted-foreground">{billingPeriodKindLabel(tariff.billingPeriod)}</p>
            </Field>
          ) : effectiveConsumption === "pack" ? (
            <Field label="Facturación">
              <p className="text-sm text-muted-foreground">Pago único</p>
            </Field>
          ) : (
            <FormSelect
              label="Facturación"
              name="billingPeriod"
              required
              disabled={pending}
              value={billingPeriod}
              onValueChange={(value) => setBillingPeriod(value as TariffBilling | "")}
              options={[
                { value: "", label: "Elegí un periodo de facturación…" },
                ...SUBSCRIPTION_BILLING.map((value) => ({ value, label: billingPeriodKindLabel(value) })),
              ]}
            />
          )}
          <MoneyField label="Precio (€)" name="price" required defaultCents={tariff?.priceCents ?? undefined} disabled={pending} />
          <FormActions pending={pending} onCancel={() => onOpenChange(false)} submitLabel={editing ? "Guardar cambios" : "Crear tarifa"} pendingLabel={"Guardando…"} />
        </fieldset>
      </form>
    </FormDialog>
  );
}

export function TariffsPanel({ tariffs }: { tariffs: TariffView[] }) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TariffView | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const pendingId = pending ? activeId : null;
  const [confirmingTariff, setConfirmingTariff] = useState<TariffView | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(tariff: TariffView) {
    setEditing(tariff);
    setDialogOpen(true);
  }

  async function setActive(tariff: TariffView, active: boolean, confirmed = false) {
    if (active === tariff.active) return;
    if (!active && !confirmed) {
      setConfirmingTariff(tariff);
      return;
    }
    if (!begin()) return;
    setActiveId(tariff.id);
    try {
      await api(`/api/v1/admin/tariffs/${tariff.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
      toast.success(active ? "Tarifa activada" : "Tarifa desactivada");
      setConfirmingTariff(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <ConfirmDialog
        open={confirmingTariff !== null}
        onOpenChange={(open) => { if (!open && pendingId === null) setConfirmingTariff(null); }}
        title="Desactivar tarifa"
        description={confirmingTariff
          ? `¿Desactivar «${confirmingTariff.name}»? No se podrá asignar a socios nuevos.`
          : ""}
        confirmLabel="Desactivar tarifa"
        confirmVariant="destructive"
        busyLabel="Desactivando…"
        busy={confirmingTariff !== null && pendingId === confirmingTariff.id}
        onConfirm={() => {
          if (confirmingTariff) void setActive(confirmingTariff, false, true);
        }}
      />
      <ModulePrimaryAction>
        <Button type="button" variant="outline" className="min-h-11" onClick={openCreate}>
          Nueva tarifa
        </Button>
      </ModulePrimaryAction>

      {tariffs.length === 0 ? (
        <ListEmptyBlock title="Todavía no hay tarifas" />
      ) : (
        <div className="overflow-x-auto rounded-lg bg-card ring-1 ring-foreground/10">
          <Table className="min-w-[44rem] text-sm">
            <TableHeader>
              <TableRow className="pointer-hover:bg-transparent">
                <TableHead className="h-10 min-w-[9rem] px-3">Tarifa</TableHead>
                <TableHead className="h-10 min-w-[7rem] px-3">Incluye</TableHead>
                <TableHead className="h-10 min-w-[6.5rem] px-3">Consumo</TableHead>
                <TableHead className="h-10 min-w-[6.5rem] px-3">Facturación</TableHead>
                <TableHead className="h-10 min-w-[5rem] px-3 text-right">Precio</TableHead>
                <TableHead className="h-10 w-[4.5rem] px-3">Activa</TableHead>
                <TableHead className="h-10 w-0 px-3 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tariffs.map((tariff) => (
                <TableRow
                  key={tariff.id}
                  className={cn("border-border", !tariff.active && "bg-muted/25")}
                >
                  <TableCell className="min-w-[9rem] max-w-[14rem] px-3 py-2.5 align-middle">
                    <span
                      className={cn("block min-w-0 truncate font-medium", !tariff.active && "text-muted-foreground")}
                      title={tariff.name}
                    >
                      {tariff.name}
                    </span>
                  </TableCell>
                  <TableCell
                    className="whitespace-nowrap px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground"
                    title={
                      usesPeriodicQuota(tariff.consumptionModel)
                        ? `${formatPeriodicQuotaIncludes(tariff.quotaDirected, tariff.quotaOpen)} / ${quotaPeriodForConsumption(tariff.consumptionModel) === "month" ? "mes" : "semana"}`
                        : `${tariff.packClasses ?? 0} clases en el pack`
                    }
                  >
                    {usesPeriodicQuota(tariff.consumptionModel) ? (
                      <>
                        <span className="text-foreground">{formatQuotaLimit(tariff.quotaDirected)}</span> dir. ·{" "}
                        <span className="text-foreground">{formatQuotaLimit(tariff.quotaOpen)}</span> open
                      </>
                    ) : (
                      <>
                        <span className="text-foreground">{tariff.packClasses ?? 0}</span> clases
                      </>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-2.5 align-middle">
                    <Badge variant="secondary" className="shrink-0">
                      {consumptionModelLabel(tariff.consumptionModel)}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-2.5 align-middle">
                    <Badge variant="outline" className="shrink-0">
                      {billingPeriodKindLabel(tariff.billingPeriod)}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-2.5 align-middle text-right text-sm tabular-nums font-medium">
                    {formatPrice(tariff.priceCents)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <Switch
                      size="sm"
                      checked={tariff.active}
                      disabled={pending}
                      aria-busy={pendingId === tariff.id}
                      aria-label={tariff.active ? `Desactivar ${tariff.name}` : `Activar ${tariff.name}`}
                      onCheckedChange={(checked) => void setActive(tariff, checked)}
                    />
                    {pendingId === tariff.id && <span role="status" className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><Spinner aria-hidden="true" />Actualizando…</span>}
                  </TableCell>
                  <TableCell className="w-0 whitespace-nowrap px-3 py-2.5 align-middle text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 px-2.5"
                      disabled={pending}
                      onClick={() => openEdit(tariff)}
                    >
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TariffDialogForm
        key={editing?.id ?? "new"}
        tariff={editing}
        open={dialogOpen}
        onOpenChange={(next) => {
          setDialogOpen(next);
          if (!next) setEditing(null);
        }}
      />
    </>
  );
}
