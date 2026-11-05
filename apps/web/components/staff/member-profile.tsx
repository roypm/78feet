"use client";

import { PendingButton } from "@/components/feedback/pending-button";
import { EmptyState } from "@/components/feedback/empty-state";

import { useState, type FormEvent, type ReactNode } from "react";
import { NavigationLink as Link } from "@/components/feedback/navigation-link";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import type { MemberSummary } from "@/lib/box/summary";
import {
  billingPeriodKindLabel,
  formatPeriodicQuotaIncludes,
  formatQuotaUsedLimit,
  isUnlimitedQuota,
  quotaPeriodForConsumption,
  usesPeriodicQuota,
} from "@78feet/domain";
import { displayPhone, emptyField, formatPrice, memberFullName } from "@/lib/box/format";
import { MarkPaidButton } from "@/components/staff/mark-paid-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FormInput } from "@/components/staff/form-control";
import { FormSelect } from "@/components/staff/form-select";
import { FormDialog } from "@/components/staff/form-dialog";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { ConsumoGestionDialog, BonoGestionDialog } from "@/components/staff/member-quota-gestion";
import { cn } from "cn";
import { ProfileAvatar } from "@/components/member/profile-avatar";

type Tariff = {
  id: string;
  name: string;
  active: boolean;
  consumptionModel: import("@78feet/domain").TariffConsumption;
  billingPeriod: import("@78feet/domain").TariffBilling;
  priceCents: number;
  packClasses: number | null;
};

export type MemberProfileData = {
  id: string;
  firstName: string;
  lastName: string;
  dni: string | null;
  phone: string | null;
  email: string | null;
  profileImageUrl: string | null;
  loginId: string;
  status: "active" | "inactive";
  membership: {
    tariffId: string;
    tariffName: string;
    consumptionModel: import("@78feet/domain").TariffConsumption;
    billingPeriod: import("@78feet/domain").TariffBilling;
    priceCents: number;
  } | null;
  paymentBoxId: string | null;
  paymentBoxName: string | null;
};

function ProfileSection({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-lg bg-card p-4 ring-1 ring-foreground/10", className)}
    >
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h2 className="text-sm font-medium leading-snug">{title}</h2>
        {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 wrap-break-word">{value}</dd>
    </div>
  );
}

function ConsumoRow({
  label,
  used,
  limit,
  adjustment,
}: {
  label: string;
  used: number;
  limit: number | null;
  adjustment: number;
}) {
  let text: string;
  if (isUnlimitedQuota(limit)) {
    text = formatQuotaUsedLimit(used, limit);
  } else {
    const total = Math.max(0, limit + adjustment);
    const available = Math.max(0, limit - used + adjustment);
    text = total === 0
      ? "0 clases disponibles"
      : `${available} de ${total} clase${total === 1 ? "" : "s"} disponible${available === 1 ? "" : "s"}`;
  }
  const value = <span className="tabular-nums">{text}</span>;

  return <FieldRow label={label} value={value} />;
}

export function MemberProfile({
  member,
  summary,
  tariffs,
  boxes,
  isAdmin,
}: {
  member: MemberProfileData;
  summary: MemberSummary;
  tariffs: Tariff[];
  boxes: { id: string; name: string }[];
  isAdmin: boolean;
}) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [openAction, setOpenAction] = useState<"tariff" | "password" | "edit" | null>(null);
  const [tariffConfirmation, setTariffConfirmation] = useState<{ tariffId: string; hasMembership: boolean } | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const assignable = tariffs.filter((tariff) => tariff.active);
  const bonoPacks = tariffs
    .filter(
      (tariff) =>
        tariff.active && tariff.consumptionModel === "pack" && tariff.packClasses != null && tariff.packClasses > 0,
    )
    .sort((left, right) => (left.packClasses ?? 0) - (right.packClasses ?? 0));
  const active = member.status === "active";
  const { tariff, quota } = summary;
  const directedAdjustment = quota.directedAdjustment ?? 0;
  const openAdjustment = quota.openAdjustment ?? 0;
  const canAdjustQuota =
    !isUnlimitedQuota(quota.directedLimit) || !isUnlimitedQuota(quota.openLimit);
  const periodText = quota.period === "month" ? "Este mes" : "Esta semana";
  const periodLabel = quota.periodLabel ?? "";
  const showBonoSection =
    (tariff && usesPeriodicQuota(tariff.consumptionModel)) ||
    tariff?.consumptionModel === "pack" ||
    quota.packBalance > 0;
  const showConsumosSection = tariff ? usesPeriodicQuota(tariff.consumptionModel) : false;

  async function changeTariff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tariffId = String(new FormData(event.currentTarget).get("tariffId"));
    const hasMembership = Boolean(member.membership);
    setTariffConfirmation({ tariffId, hasMembership });
  }

  async function confirmTariffChange() {
    if (!tariffConfirmation) return;
    const { tariffId, hasMembership } = tariffConfirmation;
    if (!begin()) return;
    try {
      const result = await api<{ cancelledBookingCount: number }>(`/api/v1/admin/members/${member.id}/tariff`, {
        method: "POST",
        body: JSON.stringify({ tariffId }),
      });
      toast.success(
        hasMembership
          ? `Tarifa actualizada. ${result.cancelledBookingCount} reservas canceladas.`
          : "Tarifa asignada.",
      );
      setTariffConfirmation(null);
      setOpenAction(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar");
    } finally {
      setPending(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const password = String(new FormData(formElement).get("password"));
    if (!begin()) return;
    try {
      await api(`/api/v1/admin/members/${member.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      toast.success("Contraseña reseteada");
      formElement.reset();
      setOpenAction(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo resetear");
    } finally {
      setPending(false);
    }
  }

  async function deactivate() {
    if (!begin()) return;
    try {
      await api(`/api/v1/admin/members/${member.id}/deactivate`, { method: "POST" });
      setConfirmDeactivate(false);
      toast.success("Socio dado de baja");
      router.push("/staff/socios?estado=baja");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo dar de baja");
    } finally {
      setPending(false);
    }
  }

  async function reactivate() {
    if (!begin()) return;
    try {
      await api(`/api/v1/admin/members/${member.id}/reactivate`, { method: "POST" });
      toast.success("Socio reactivado. Asigná una tarifa si hace falta.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo reactivar");
    } finally {
      setPending(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const phoneRaw = String(form.get("phone") ?? "").trim();
    const emailRaw = String(form.get("email") ?? "").trim();
    if (!begin()) return;
    try {
      await api(`/api/v1/admin/members/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          firstName: String(form.get("firstName")),
          lastName: String(form.get("lastName")),
          dni: String(form.get("dni")),
          phone: phoneRaw || null,
          email: emailRaw || null,
        }),
      });
      toast.success("Datos del socio actualizados");
      setOpenAction(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setPending(false);
    }
  }

  const editProfileDialog = (
    <FormDialog
      open={openAction === "edit"}
      onOpenChange={(open) => setOpenAction(open ? "edit" : null)}
      busy={pending}
      trigger={
        <Button type="button" variant="outline" className="min-h-11" disabled={pending}>
          Editar datos
        </Button>
      }
      title="Editar datos del socio"
      description="Nombre, DNI, teléfono y email. Si cambiás el DNI, también cambia el usuario de acceso."
    >
      <form onSubmit={(event) => void saveProfile(event)} className="flex flex-col gap-4">
        <fieldset disabled={pending} aria-busy={pending} className="contents">
          <FormInput label="Nombre" name="firstName" required defaultValue={member.firstName} autoComplete="given-name" />
          <FormInput label="Apellidos" name="lastName" required defaultValue={member.lastName} autoComplete="family-name" />
          <FormInput label="DNI" name="dni" required defaultValue={member.dni ?? member.loginId} />
          <FormInput label="Teléfono" name="phone" type="tel" defaultValue={member.phone ?? ""} autoComplete="tel" />
          <FormInput label="Email" name="email" type="email" defaultValue={member.email ?? ""} autoComplete="email" />
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setOpenAction(null)}>
              Cancelar
            </Button>
            <PendingButton type="submit" className="min-h-11" disabled={pending} pending={pending} pendingLabel={"Guardando…"}>
              {"Guardar cambios"}
            </PendingButton>
          </DialogFooter>
        </fieldset>
      </form>
    </FormDialog>
  );

  const resetPasswordDialog = (
    <FormDialog
      open={openAction === "password"}
      onOpenChange={(open) => setOpenAction(open ? "password" : null)}
      busy={pending}
      trigger={
        <Button type="button" variant="outline" className="min-h-11" disabled={pending || !active}>
          Resetear contraseña
        </Button>
      }
      title="Resetear contraseña"
      description="Definí la nueva contraseña que usará el socio para entrar."
    >
      <form onSubmit={(event) => void resetPassword(event)} className="flex flex-col gap-4">
        <fieldset disabled={pending} aria-busy={pending} className="contents">
          <FormInput label="Nueva contraseña" name="password" type="password" required minLength={8} autoComplete="new-password" />
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setOpenAction(null)}>
              Cancelar
            </Button>
            <PendingButton type="submit" className="min-h-11" disabled={pending} pending={pending} pendingLabel={"Guardando…"}>
              {"Resetear contraseña"}
            </PendingButton>
          </DialogFooter>
        </fieldset>
      </form>
    </FormDialog>
  );

  const changeTariffDialog = (
    <FormDialog
      open={openAction === "tariff"}
      onOpenChange={(open) => {
        setOpenAction(open ? "tariff" : null);
        if (!open) setTariffConfirmation(null);
      }}
      busy={pending}
      trigger={
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={pending || !active || assignable.length === 0}
        >
          {member.membership ? "Cambiar tarifa" : "Asignar tarifa"}
        </Button>
      }
      title={tariffConfirmation ? "Confirmar cambio de tarifa" : member.membership ? "Cambiar tarifa" : "Asignar tarifa"}
      description={tariffConfirmation
        ? tariffConfirmation.hasMembership
          ? "Este cambio cancela todas las reservas futuras del socio y devuelve el cupo o saldo. Tendrá que volver a apuntarse con la tarifa nueva."
          : "Se asignará esta tarifa al socio."
        : "Elige la tarifa que tendrá el socio."}
    >
      {tariffConfirmation ? (
        <>
          <p className="font-medium">
            {assignable.find((item) => item.id === tariffConfirmation.tariffId)?.name ?? "Tarifa seleccionada"}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setTariffConfirmation(null)}>
              Volver
            </Button>
            <PendingButton
              type="button"
              variant={tariffConfirmation.hasMembership ? "destructive" : "default"}
              className="min-h-11"
              disabled={pending}
              onClick={() => void confirmTariffChange()}
             pending={pending} pendingLabel={"Guardando…"}>
              {tariffConfirmation.hasMembership ? "Cambiar y cancelar reservas" : "Asignar tarifa"}
            </PendingButton>
          </DialogFooter>
        </>
      ) : (
        <form onSubmit={(event) => void changeTariff(event)} className="flex flex-col gap-4">
        <fieldset disabled={pending} aria-busy={pending} className="contents">
          <FormSelect label="Tarifa" name="tariffId" required defaultValue="" disabled={pending}
            options={[{ value: "", label: "Elegí una tarifa…" }, ...assignable.map((item) => ({ value: item.id, label: item.name }))]} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={pending}
              onClick={() => {
                setTariffConfirmation(null);
                setOpenAction(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" className="min-h-11" disabled={pending}>
              {member.membership ? "Cambiar tarifa" : "Asignar tarifa"}
            </Button>
          </DialogFooter>
        </fieldset>
      </form>
      )}
    </FormDialog>
  );


  const paymentsHistoryLink = (
    <Link
      href={`/staff/socios/${member.id}/pagos`}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "inline-flex h-8 shrink-0 items-center justify-center px-2.5",
      )}
    >
      Pagos registrados
    </Link>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <ProfileSection
            title="Información personal"
            action={
              <>
                {editProfileDialog}
                {active ? resetPasswordDialog : null}
              </>
            }
          >
            <div className="mb-3 flex items-center gap-3">
              <ProfileAvatar name={memberFullName(member.firstName, member.lastName)} imageUrl={member.profileImageUrl} />
              <span className="font-medium">{memberFullName(member.firstName, member.lastName)}</span>
            </div>
            <dl className="flex flex-col gap-3">
              <FieldRow label="Nombre" value={memberFullName(member.firstName, member.lastName)} />
              <FieldRow label="DNI" value={emptyField(member.dni)} />
              <FieldRow label="Teléfono" value={displayPhone(member.phone)} />
              <FieldRow label="Email" value={emptyField(member.email)} />
              <FieldRow label="Usuario" value={member.loginId} />
            </dl>
          </ProfileSection>

          {showConsumosSection ? (
            <ProfileSection
              title="Consumo"
              action={
                active && canAdjustQuota ? (
                  <ConsumoGestionDialog
                    memberId={member.id}
                    disabled={false}
                    directedUsed={quota.directedUsed}
                    directedLimit={quota.directedLimit}
                    directedAdjustment={directedAdjustment}
                    openUsed={quota.openUsed}
                    openLimit={quota.openLimit}
                    openAdjustment={openAdjustment}
                    periodText={periodText}
                    periodLabel={periodLabel}
                  />
                ) : null
              }
            >
              <dl className="flex flex-col gap-3">
                <ConsumoRow
                  label="Dirigidas"
                  used={quota.directedUsed}
                  limit={quota.directedLimit}
                  adjustment={directedAdjustment}
                />
                <ConsumoRow
                  label="Opens"
                  used={quota.openUsed}
                  limit={quota.openLimit}
                  adjustment={openAdjustment}
                />
              </dl>
              <p className="text-xs tabular-nums text-muted-foreground">{periodText} · {periodLabel}</p>
            </ProfileSection>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <ProfileSection title="Box de pago">
            <p className="text-sm text-muted-foreground">Cambiarlo no cancela reservas ni reescribe pagos ya hechos.</p>
            <form
              className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                const paymentBoxId = String(new FormData(event.currentTarget).get("paymentBoxId"));
                if (!begin()) return;
                void api(`/api/v1/admin/members/${member.id}/payment-box`, {
                  method: "POST",
                  body: JSON.stringify({ paymentBoxId }),
                })
                  .then(() => {
                    toast.success("Box de pago actualizado");
                    router.refresh();
                  })
                  .catch((error: unknown) => {
                    toast.error(error instanceof Error ? error.message : "No se pudo cambiar el box");
                  })
                  .finally(() => setPending(false));
              }}
            >
              <FormSelect
                label="Box de pago"
                labelClassName="sr-only"
                name="paymentBoxId"
                required
                disabled={pending}
                defaultValue={member.paymentBoxId ?? boxes[0]?.id ?? ""}
                options={boxes.map((box) => ({ value: box.id, label: box.name }))}
              />
              <PendingButton type="submit" variant="outline" className="min-h-11" pending={pending} pendingLabel="Guardando…">
                Guardar
              </PendingButton>
            </form>
          </ProfileSection>

          <ProfileSection title="Pagos" action={paymentsHistoryLink}>
            {summary.payment ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">{summary.payment.periodLabel}</span>
                {summary.payment.status === "paid" ? (
                  <Badge className="bg-success text-white">Pagado</Badge>
                ) : active ? (
                  <MarkPaidButton
                    userId={member.id}
                    billingPeriod={summary.payment.billingPeriod}
                    periodStart={summary.payment.periodStart}
                    periodLabel={summary.payment.periodLabel}
                    amountCents={tariff?.priceCents ?? 0}
                  />
                ) : (
                  <Badge variant="outline">Pendiente</Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Cobros del socio: periodo en curso (si aplica), pagos únicos y bonos. Desde el historial podés corregir un importe o eliminar un registro erróneo.
              </p>
            )}
          </ProfileSection>

          <ProfileSection title="Tarifa" action={active ? changeTariffDialog : null}>
            {!tariff ? (
              <EmptyState compact title="Sin tarifa activa" description={active ? assignable.length > 0 ? "Asigná una tarifa desde el botón de esta sección." : "El admin tiene que crear o activar una tarifa para poder asignarla." : "La cuenta está dada de baja. La tarifa podrá asignarse al reactivarla."} />
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{tariff.name}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">{formatPrice(tariff.priceCents)}</span>
                </div>
                {tariff.consumptionModel === "pack" ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">Las reservas consumen el saldo de bono; no hay cupo periódico.</p>
                    <FieldRow label="Facturación" value={billingPeriodKindLabel(tariff.billingPeriod)} />
                  </div>
                ) : (
                  <>
                    <dl className="flex flex-col gap-2">
                      <FieldRow
                        label={`Incluye cada ${quotaPeriodForConsumption(tariff.consumptionModel) === "month" ? "mes" : "semana"}`}
                        value={
                          <span className="tabular-nums">
                            {formatPeriodicQuotaIncludes(tariff.quotaDirected, tariff.quotaOpen)}
                          </span>
                        }
                      />
                      <FieldRow
                        label="Facturación"
                        value={billingPeriodKindLabel(tariff.billingPeriod)}
                      />
                    </dl>
                  </>
                )}
              </div>
            )}
          </ProfileSection>

          {showBonoSection ? (
            <ProfileSection
              title="Bono"
              action={
                active ? (
                  <BonoGestionDialog
                    memberId={member.id}
                    disabled={false}
                    bonoPacks={bonoPacks}
                    balance={quota.packBalance}
                  />
                ) : null
              }
            >
              <dl>
                <div>
                  <dt className="text-sm text-muted-foreground">Saldo de bono</dt>
                  <dd className="text-lg font-medium tabular-nums">{quota.packBalance}</dd>
                </div>
              </dl>
              <p className="text-sm text-muted-foreground">
                Se usa cuando se agota el cupo del periodo o con tarifa bono. No caduca.
              </p>
            </ProfileSection>
          ) : null}
        </div>
      </div>

      {!active && isAdmin ? (
        <div className="flex justify-start pt-1">
          <PendingButton type="button" className="min-h-11" disabled={pending} onClick={() => void reactivate()} pending={pending} pendingLabel={"Reactivando…"}>
            {"Reactivar socio"}
          </PendingButton>
        </div>
      ) : null}

      {active && isAdmin ? (
        <div className="border-t border-border pt-4">
          <Button type="button" variant="destructive" className="min-h-11" disabled={pending} onClick={() => setConfirmDeactivate(true)}>
            Dar de baja
          </Button>
          <p className="mt-2 text-sm text-muted-foreground">
            Desactiva la cuenta y cancela reservas futuras. La ficha se conserva en «Dados de baja».
          </p>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmDeactivate}
        onOpenChange={(open) => { if (!open && !pending) setConfirmDeactivate(false); }}
        title="Dar de baja al socio"
        description="Se cancelarán sus reservas futuras y se desactivará la cuenta. La ficha y el historial se conservarán."
        confirmLabel="Dar de baja"
        confirmVariant="destructive"
        busyLabel="Dando de baja…"
        busy={pending}
        onConfirm={() => void deactivate()}
      />
    </div>
  );
}
