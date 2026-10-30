"use client";

import { PendingButton } from "@/components/feedback/pending-button";

import { EmptyState } from "@/components/feedback/empty-state";

import { useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import {
  billingPeriodKindLabel,
  consumptionModelLabel,
  usesPeriodicQuota,
  type TariffBilling,
  type TariffConsumption,
} from "@78feet/domain";
import { api } from "@/lib/box/api";
import type { TariffView } from "@/lib/box/tariffs";
import { formatPrice } from "@/lib/box/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Field, controlClass } from "@/components/staff/field";
import { FormDialog } from "@/components/staff/form-dialog";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { ModulePrimaryAction } from "@/components/member/module-page";
import { cn } from "cn";

const SUBSCRIPTION_BILLING: TariffBilling[] = ["monthly", "quarterly", "semiannual", "annual", "none"];

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
  const [consumptionModel, setConsumptionModel] = useState<TariffConsumption>(
    tariff?.consumptionModel ?? "weekly_quota",
  );
  const [billingPeriod, setBillingPeriod] = useState<TariffBilling>(
    tariff?.billingPeriod ?? "monthly",
  );

  const editing = tariff !== null;
  const eurosDefault = tariff ? (tariff.priceCents / 100).toFixed(2) : "70";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const euros = Number(form.get("price"));
    if (!Number.isFinite(euros) || euros < 0) {
      toast.error("Precio no válido");
      return;
    }

    const effectiveConsumption = editing ? tariff.consumptionModel : consumptionModel;
    const effectiveBilling = editing ? tariff.billingPeriod : billingPeriod;

    const body = {
      name: String(form.get("name")),
      consumptionModel: effectiveConsumption,
      billingPeriod: effectiveBilling,
      priceCents: Math.round(euros * 100),
      weeklyDirected:
        usesPeriodicQuota(effectiveConsumption) ? Number(form.get("weeklyDirected")) : 0,
      weeklyOpen: usesPeriodicQuota(effectiveConsumption) ? Number(form.get("weeklyOpen")) : 0,
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
        setConsumptionModel("weekly_quota");
        setBillingPeriod("monthly");
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
          <Field label="Nombre">
            <Input name="name" required defaultValue={tariff?.name ?? ""} />
          </Field>
          <Field label="Consumo">
            {editing ? (
              <p className="text-sm text-muted-foreground">{consumptionModelLabel(tariff.consumptionModel)}</p>
            ) : (
              <select
                name="consumptionModel"
                className={controlClass}
                value={consumptionModel}
                onChange={(event) => {
                  const next = event.target.value as TariffConsumption;
                  setConsumptionModel(next);
                  if (next === "pack") setBillingPeriod("one_time");
                  else if (billingPeriod === "one_time") setBillingPeriod("monthly");
                }}
              >
                <option value="weekly_quota">Cupo semanal</option>
                <option value="monthly_quota">Cupo mensual</option>
                <option value="pack">Bono</option>
              </select>
            )}
          </Field>
          {usesPeriodicQuota(effectiveConsumption) ? (
            <>
              <Field label="Dirigidas / semana">
                <Input
                  name="weeklyDirected"
                  type="number"
                  min={0}
                  required
                  defaultValue={tariff?.weeklyDirected ?? 3}
                  className="tabular-nums"
                />
              </Field>
              <Field label="Opens / semana">
                <Input
                  name="weeklyOpen"
                  type="number"
                  min={0}
                  required
                  defaultValue={tariff?.weeklyOpen ?? 1}
                  className="tabular-nums"
                />
              </Field>
            </>
          ) : (
            <Field label="Clases del bono">
              <Input
                name="packClasses"
                type="number"
                min={1}
                required
                defaultValue={tariff?.packClasses ?? 8}
                className="tabular-nums"
              />
            </Field>
          )}
          <Field label="Facturación">
            {editing ? (
              <p className="text-sm text-muted-foreground">{billingPeriodKindLabel(tariff.billingPeriod)}</p>
            ) : effectiveConsumption === "pack" ? (
              <p className="text-sm text-muted-foreground">Pago único</p>
            ) : (
              <select
                name="billingPeriod"
                className={controlClass}
                value={billingPeriod}
                onChange={(event) => setBillingPeriod(event.target.value as TariffBilling)}
              >
                {SUBSCRIPTION_BILLING.map((value) => (
                  <option key={value} value={value}>
                    {billingPeriodKindLabel(value)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Precio (€)">
            <Input
              name="price"
              type="number"
              min={0}
              step="0.01"
              required
              defaultValue={eurosDefault}
              className="tabular-nums"
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <PendingButton type="submit" className="min-h-11" disabled={pending} pending={pending} pendingLabel={"Guardando…"}>
              {editing ? "Guardar cambios" : "Crear tarifa"}
            </PendingButton>
          </DialogFooter>
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
        <EmptyState title="Todavía no hay tarifas" description="Creá una tarifa para poder asignarla a los socios."><Button type="button" className="min-h-11" onClick={openCreate}>Nueva tarifa</Button></EmptyState>
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
                        ? `${tariff.weeklyDirected} dirigidas · ${tariff.weeklyOpen} opens / semana`
                        : `${tariff.packClasses ?? 0} clases en el pack`
                    }
                  >
                    {usesPeriodicQuota(tariff.consumptionModel) ? (
                      <>
                        <span className="text-foreground">{tariff.weeklyDirected}</span> dir. ·{" "}
                        <span className="text-foreground">{tariff.weeklyOpen}</span> open
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
