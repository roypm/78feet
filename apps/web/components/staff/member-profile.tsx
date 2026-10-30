"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import type { MemberSummary } from "@/lib/box/summary";
import { billingPeriodKindLabel, localDateString, usesPeriodicQuota, weekEndDate, weekStartDate } from "@78feet/domain";
import { formatPrice, formatWeekRange, memberFullName } from "@/lib/box/format";
import { MarkPaidButton } from "@/components/staff/mark-paid-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, controlClass } from "@/components/staff/field";
import { FormDialog } from "@/components/staff/form-dialog";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { ConsumoGestionDialog, BonoGestionDialog } from "@/components/staff/member-quota-gestion";
import { cn } from "cn";

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
  loginId: string;
  status: "active" | "inactive";
  membership: {
    tariffId: string;
    tariffName: string;
    consumptionModel: import("@78feet/domain").TariffConsumption;
    billingPeriod: import("@78feet/domain").TariffBilling;
    priceCents: number;
  } | null;
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

function ConsumoRow({ label, available, total }: { label: string; available: number; total: number }) {
  const value =
    total === 0 ? (
      "—"
    ) : (
      <span className="tabular-nums">
        {available} de {total} clase{total === 1 ? "" : "s"} disponible{available === 1 ? "" : "s"}
      </span>
    );

  return <FieldRow label={label} value={value} />;
}

export function MemberProfile({
  member,
  summary,
  tariffs,
  isAdmin,
}: {
  member: MemberProfileData;
  summary: MemberSummary;
  tariffs: Tariff[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
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
  const directedAvailable = Math.max(
    0,
    quota.directedLimit - quota.directedUsed + (quota.directedAdjustment ?? 0),
  );
  const openAvailable = Math.max(0, quota.openLimit - quota.openUsed + (quota.openAdjustment ?? 0));
  const weekLabel = formatWeekRange(weekStartDate(localDateString(new Date())), weekEndDate(localDateString(new Date())));
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
    setPending(true);
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
    setPending(true);
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
    setPending(true);
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
    setPending(true);
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
    setPending(true);
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
        <Field label="Nombre">
          <Input name="firstName" required defaultValue={member.firstName} autoComplete="given-name" />
        </Field>
        <Field label="Apellidos">
          <Input name="lastName" required defaultValue={member.lastName} autoComplete="family-name" />
        </Field>
        <Field label="DNI">
          <Input name="dni" required defaultValue={member.dni ?? member.loginId} />
        </Field>
        <Field label="Teléfono">
          <Input name="phone" type="tel" defaultValue={member.phone ?? ""} autoComplete="tel" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" defaultValue={member.email ?? ""} autoComplete="email" />
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setOpenAction(null)}>
            Cancelar
          </Button>
          <Button type="submit" className="min-h-11" disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </DialogFooter>
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
        <Field label="Nueva contraseña">
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setOpenAction(null)}>
            Cancelar
          </Button>
          <Button type="submit" className="min-h-11" disabled={pending}>
            {pending ? "Guardando…" : "Resetear contraseña"}
          </Button>
        </DialogFooter>
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
            <Button
              type="button"
              variant={tariffConfirmation.hasMembership ? "destructive" : "default"}
              className="min-h-11"
              disabled={pending}
              onClick={() => void confirmTariffChange()}
            >
              {pending ? "Guardando…" : tariffConfirmation.hasMembership ? "Cambiar y cancelar reservas" : "Asignar tarifa"}
            </Button>
          </DialogFooter>
        </>
      ) : (
        <form onSubmit={(event) => void changeTariff(event)} className="flex flex-col gap-4">
          <Field label="Tarifa">
            <select name="tariffId" required defaultValue={member.membership?.tariffId ?? ""} className={controlClass}>
              {assignable.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
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
        </form>
      )}
    </FormDialog>
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
                <Link
                  href={`/staff/socios/${member.id}/pagos`}
                  className={cn(buttonVariants({ variant: "outline" }), "min-h-11 inline-flex items-center justify-center px-2.5")}
                >
                  Historial
                </Link>
                {active ? resetPasswordDialog : null}
              </>
            }
          >
            <dl className="flex flex-col gap-3">
              <FieldRow label="Nombre" value={memberFullName(member.firstName, member.lastName)} />
              <FieldRow label="DNI" value={member.dni ?? "—"} />
              <FieldRow label="Teléfono" value={member.phone ?? "—"} />
              <FieldRow label="Email" value={member.email ?? "—"} />
              <FieldRow label="Usuario" value={member.loginId} />
            </dl>
          </ProfileSection>

          {showConsumosSection ? (
            <ProfileSection
              title="Consumo"
              action={
                active ? (
                  <ConsumoGestionDialog
                    memberId={member.id}
                    disabled={false}
                    directedAvailable={directedAvailable}
                    directedTotal={quota.directedLimit}
                    openAvailable={openAvailable}
                    openTotal={quota.openLimit}
                    weekLabel={weekLabel}
                  />
                ) : null
              }
            >
              <dl className="flex flex-col gap-3">
                <ConsumoRow label="Dirigidas" available={directedAvailable} total={quota.directedLimit} />
                <ConsumoRow label="Opens" available={openAvailable} total={quota.openLimit} />
              </dl>
              <p className="text-xs tabular-nums text-muted-foreground">Esta semana · {weekLabel}</p>
            </ProfileSection>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <ProfileSection title="Tarifa" action={active ? changeTariffDialog : null}>
            {!tariff ? (
              <p className="text-sm text-muted-foreground">
                {active ? "Sin tarifa activa. Asigná una con el botón de arriba." : "Sin tarifa activa."}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{tariff.name}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">{formatPrice(tariff.priceCents)}</span>
                </div>
                {tariff.consumptionModel === "pack" ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">Las reservas consumen el saldo de bono; no hay cupo semanal.</p>
                    <FieldRow label="Facturación" value={billingPeriodKindLabel(tariff.billingPeriod)} />
                  </div>
                ) : (
                  <>
                    <dl className="flex flex-col gap-2">
                      <FieldRow
                        label="Incluye cada semana"
                        value={
                          <span className="tabular-nums">
                            {tariff.weeklyDirected} dirigida{tariff.weeklyDirected === 1 ? "" : "s"} · {tariff.weeklyOpen}{" "}
                            open
                            {tariff.weeklyOpen === 1 ? "" : "s"}
                          </span>
                        }
                      />
                      <FieldRow
                        label="Facturación"
                        value={billingPeriodKindLabel(tariff.billingPeriod)}
                      />
                    </dl>
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
                            amountCents={tariff.priceCents}
                          />
                        ) : (
                          <Badge variant="outline">Pendiente</Badge>
                        )}
                      </div>
                    ) : null}
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
                Se usa cuando el cupo semanal está agotado o con tarifa bono. No caduca.
              </p>
            </ProfileSection>
          ) : null}
        </div>
      </div>

      {!active && isAdmin ? (
        <div className="flex justify-start pt-1">
          <Button type="button" className="min-h-11" disabled={pending} onClick={() => void reactivate()}>
            {pending ? "Reactivando…" : "Reactivar socio"}
          </Button>
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
