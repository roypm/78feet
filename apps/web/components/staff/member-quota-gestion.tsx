"use client";

import { PendingButton } from "@/components/feedback/pending-button";

import { useState, type FormEvent, type ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/feedback/empty-state";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import type { ClassKind } from "@78feet/domain";
import { api } from "@/lib/box/api";
import { formatPrice } from "@/lib/box/format";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, controlClass } from "@/components/staff/field";
import { FormDialog } from "@/components/staff/form-dialog";
import { cn } from "cn";

type BonoPack = {
  id: string;
  name: string;
  packClasses: number | null;
  priceCents: number;
};

function gestionTrigger(disabled: boolean) {
  return (
    <Button type="button" variant="outline" className="min-h-11" disabled={disabled}>
      Gestión
    </Button>
  );
}

function GestionActualBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-md bg-muted/40 p-3", className)}>
      <p className="mb-2 text-sm font-medium">Actual</p>
      {children}
    </div>
  );
}

function consumoLine(available: number, total: number): string {
  if (total === 0) return "0 clases disponibles";
  return `${available} de ${total} clase${total === 1 ? "" : "s"} disponible${available === 1 ? "" : "s"}`;
}

function KindAdjustRow({
  label,
  kind,
  memberId,
  pending,
  onPending,
  onBegin,
  activeDelta,
  onDone,
}: {
  label: string;
  kind: ClassKind;
  memberId: string;
  pending: boolean;
  onPending: (value: boolean) => void;
  onBegin: (kind: ClassKind, delta: number) => boolean;
  activeDelta?: number;
  onDone: () => void;
}) {
  async function adjust(delta: number) {
    if (pending || !onBegin(kind, delta)) return;
    onPending(true);
    try {
      await api(`/api/v1/admin/members/${memberId}/weekly-quota`, {
        method: "POST",
        body: JSON.stringify({ kind, delta }),
      });
      toast.success(delta > 0 ? "Cupo ampliado" : "Cupo reducido");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo ajustar");
    } finally {
      onPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="min-h-11" disabled={pending} aria-busy={pending && activeDelta === -1} onClick={() => void adjust(-1)}>
          {pending && activeDelta === -1 && <Spinner aria-hidden="true" />}
          Quitar 1
        </Button>
        <Button type="button" variant="outline" className="min-h-11" disabled={pending} aria-busy={pending && activeDelta === 1} onClick={() => void adjust(1)}>
          {pending && activeDelta === 1 && <Spinner aria-hidden="true" />}
          Añadir 1
        </Button>
      </div>
    </div>
  );
}

export function ConsumoGestionDialog({
  memberId,
  disabled,
  directedAvailable,
  directedTotal,
  openAvailable,
  openTotal,
  weekLabel,
}: {
  memberId: string;
  disabled: boolean;
  directedAvailable: number;
  directedTotal: number;
  openAvailable: number;
  openTotal: number;
  weekLabel: string;
}) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [open, setOpen] = useState(false);
  const [activeAdjustment, setActiveAdjustment] = useState<{ kind: ClassKind; delta: number } | null>(null);

  function beginAdjustment(kind: ClassKind, delta: number) {
    if (!begin()) return false;
    setActiveAdjustment({ kind, delta });
    return true;
  }

  function refresh() {
    router.refresh();
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      busy={pending}
      trigger={gestionTrigger(disabled)}
      title="Gestión de consumo"
      description="Ajuste manual del cupo semanal (esta semana). Para apuntar a una clase usá Semana o Hoy."
    >
      <div className="flex flex-col gap-4">
        <GestionActualBox>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Dirigidas</dt>
              <dd className="tabular-nums font-medium">{consumoLine(directedAvailable, directedTotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Opens</dt>
              <dd className="tabular-nums font-medium">{consumoLine(openAvailable, openTotal)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs tabular-nums text-muted-foreground">Esta semana · {weekLabel}</p>
        </GestionActualBox>
        <KindAdjustRow
          label="Dirigidas"
          kind="directed"
          memberId={memberId}
          pending={pending}
          onPending={setPending}
          onBegin={beginAdjustment}
          activeDelta={activeAdjustment?.kind === "directed" ? activeAdjustment.delta : undefined}
          onDone={refresh}
        />
        <KindAdjustRow label="Opens" kind="open" memberId={memberId} pending={pending} onPending={setPending} onBegin={beginAdjustment} activeDelta={activeAdjustment?.kind === "open" ? activeAdjustment.delta : undefined} onDone={refresh} />
        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </div>
    </FormDialog>
  );
}

export function BonoGestionDialog({
  memberId,
  disabled,
  bonoPacks,
  balance,
}: {
  memberId: string;
  disabled: boolean;
  bonoPacks: BonoPack[];
  balance: number;
}) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [open, setOpen] = useState(false);
  const [activeQuantity, setActiveQuantity] = useState<number | null>(null);
  const [addingPack, setAddingPack] = useState(false);

  async function adjustCredits(quantity: number, note?: string, closeOnSuccess = false) {
    if (!begin()) return;
    setActiveQuantity(quantity);
    setAddingPack(closeOnSuccess);
    try {
      await api(`/api/v1/admin/members/${memberId}/credits`, {
        method: "POST",
        body: JSON.stringify({ quantity, note: note ?? null }),
      });
      toast.success(quantity > 0 ? "Saldo aumentado" : "Saldo reducido");
      if (closeOnSuccess) setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo ajustar");
    } finally {
      setPending(false);
    }
  }

  async function addPack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const packTariffId = String(new FormData(event.currentTarget).get("packTariffId"));
    const pack = bonoPacks.find((item) => item.id === packTariffId);
    if (!pack?.packClasses) {
      toast.error("Elegí un pack");
      return;
    }
    await adjustCredits(pack.packClasses, pack.name, true);
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      busy={pending}
      trigger={gestionTrigger(disabled)}
      title="Gestión de bono"
      description="Corrección rápida del saldo. Los packs suman clases del catálogo."
    >
      <GestionActualBox>
        <p className="text-sm text-muted-foreground">Saldo de bono</p>
        <p className="text-lg font-medium tabular-nums">
          {balance} clase{balance === 1 ? "" : "s"}
        </p>
      </GestionActualBox>
      <form onSubmit={(event) => void addPack(event)} className="flex flex-col gap-4 border-t border-border pt-4">
        <fieldset disabled={pending} aria-busy={pending} className="contents">
          <Field label="Añadir pack">
            <select
              name="packTariffId"
              required={bonoPacks.length > 0}
              className={controlClass}
              defaultValue={bonoPacks[0]?.id ?? ""}
              disabled={bonoPacks.length === 0}
            >
              {bonoPacks.length === 0 ? (
                <option value="">Sin packs en el catálogo</option>
              ) : (
                bonoPacks.map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.name} · {pack.packClasses} clase{pack.packClasses === 1 ? "" : "s"} · {formatPrice(pack.priceCents)}
                  </option>
                ))
              )}
            </select>
          </Field>
          {bonoPacks.length === 0 ? (
            <EmptyState
              compact
              title="No hay packs disponibles"
              description="El admin puede crear tarifas de tipo Bono. Mientras tanto podés usar el ajuste manual del saldo."
            />
          ) : null}
          <PendingButton
            type="submit"
            className="min-h-11"
            disabled={pending || bonoPacks.length === 0}
            pending={pending && addingPack}
            pendingLabel={"Aplicando…"}
          >
            {"Añadir pack al saldo"}
          </PendingButton>
        </fieldset>
      </form>
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="text-sm font-medium">Ajuste fino</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-11" disabled={pending} aria-busy={pending && !addingPack && activeQuantity === -1} onClick={() => void adjustCredits(-1)}>
            {pending && !addingPack && activeQuantity === -1 && <Spinner aria-hidden="true" />}
            Quitar 1 clase
          </Button>
          <Button type="button" variant="outline" className="min-h-11" disabled={pending} aria-busy={pending && !addingPack && activeQuantity === 1} onClick={() => void adjustCredits(1)}>
            {pending && !addingPack && activeQuantity === 1 && <Spinner aria-hidden="true" />}
            Añadir 1 clase
          </Button>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setOpen(false)}>
          Cerrar
        </Button>
      </DialogFooter>
    </FormDialog>
  );
}
