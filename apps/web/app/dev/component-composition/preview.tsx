"use client";

import { useState, type ComponentProps } from "react";
import { FormActions } from "@/components/common/forms/form-actions";
import { ConfirmDialog } from "@/components/common/dialogs/confirm-dialog";
import { ListPagination } from "@/components/common/lists/list-pagination";
import { MemberPaymentsTable } from "@/components/payments/member-payments-table";
import { PaymentFields } from "@/components/payments/payment-fields";
import { BoxTabs } from "@/components/boxes/box-tabs";
import { MemberProfile } from "@/components/members/member-profile";
import { TrainingForm } from "@/components/trainings/training-form";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";

const modes = ["demo", "worst", "empty", "one", "pending"] as const;
type Mode = (typeof modes)[number];

export function CompositionPreview({ initialMode, initialPage = 1 }: { initialMode: string; initialPage?: number }) {
  const [mode, setMode] = useState<Mode>(modes.find((item) => item === initialMode) ?? "demo");
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const { resolvedTheme, applyTheme } = useTheme();
  const worst = mode === "worst";
  const empty = mode === "empty";
  const pending = mode === "pending";
  const label = worst ? "María José de la Cruz y Fernández — preparación de competición y movilidad" : "Entrenamiento";
  const boxes = Array.from({ length: empty ? 0 : mode === "one" ? 1 : worst ? 4 : 3 }, (_, index) => ({
    id: String(index),
    name: worst ? `Box ${index + 1} — Centro de preparación física y entrenamiento funcional` : `Box ${index + 1}`,
  }));
  const totalPayments = empty ? 0 : mode === "one" ? 1 : worst ? 26 : 25;
  const totalPages = Math.max(1, Math.ceil(totalPayments / 25));
  const paymentPage = Math.min(initialPage, totalPages);
  const payments = Array.from({ length: Math.min(25, totalPayments - (paymentPage - 1) * 25) }, (_, index) => ({
    id: `demo-payment-${(paymentPage - 1) * 25 + index}`,
    billingPeriod: "one_time" as const,
    periodStart: null,
    amountCents: index === 0 ? 0 : 1999,
    method: "bizum",
    createdAt: "2026-11-11T09:00:00.000Z",
    recordedByName: worst ? "María José de la Cruz y Fernández" : "Marta G.",
  }));
  const profile: ComponentProps<typeof MemberProfile> = {
    member: {
      id: "demo",
      firstName: worst ? "María José" : "Marta",
      lastName: worst ? "de la Cruz y Fernández" : "García",
      dni: null,
      phone: null,
      email: worst ? "mariajose.delacruzyfernandez@entrenamientofuncional.example.com" : null,
      profileImageUrl: null,
      loginId: "demo",
      status: "inactive",
      membership: null,
      paymentBoxId: null,
      paymentBoxName: null,
    },
    summary: {
      tariff: empty
        ? null
        : {
            name: label,
            consumptionModel: "weekly_quota",
            billingPeriod: "monthly",
            priceCents: 0,
            quotaDirected: 1,
            quotaOpen: null,
          },
      quota: {
        period: "week",
        periodStart: "2026-11-09",
        periodEnd: "2026-11-15",
        periodLabel: "9–15 noviembre",
        directedUsed: 0,
        directedLimit: 1,
        directedAdjustment: 0,
        openUsed: 3,
        openLimit: null,
        openAdjustment: 0,
        packBalance: mode === "one" ? 1 : 0,
      },
      payment: null,
    },
    tariffs: [],
    boxes,
    isAdmin: false,
  };

  function changeMode(next: Mode) {
    setMode(next);
    setConfirmed(false);
    window.history.replaceState(null, "", `?data=${next}`);
  }

  return (
    <main data-theme={resolvedTheme} className="min-h-dvh bg-background p-4 pb-32 text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <h1 className="text-xl font-semibold">Composición de componentes · desarrollo</h1>
        <p className="text-sm text-muted-foreground">
          Datos ficticios. Los formularios de muestra no envían peticiones; la ficha se presenta en lectura.
        </p>
        <Button variant="outline" onClick={() => applyTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          Cambiar claro/oscuro
        </Button>
        <BoxTabs boxes={boxes} includeAll allHref="#all" hrefFor={(id) => `#box-${id}`} />
        <form
          key={mode}
          onSubmit={(event) => {
            event.preventDefault();
            setConfirmed(true);
          }}
          className="flex min-w-0 flex-col gap-4 rounded-lg bg-card p-4"
        >
          <PaymentFields
            disabled={pending}
            amountCents={mode === "one" ? 0 : worst ? 123456789 : undefined}
            method={empty ? "" : "bizum"}
          />
          <FormActions
            pending={pending}
            onCancel={() => setConfirmed(false)}
            submitLabel={label}
            pendingLabel="Guardando los cambios del formulario…"
          />
        </form>
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          busy={pending}
          title={label}
          description={
            worst
              ? `${label}. Se cancelará 1 reserva y se devolverá el cupo. Revisa la información antes de confirmar.`
              : "Confirmación de muestra."
          }
          confirmLabel={label}
          onConfirm={() => {
            setConfirmed(true);
            setConfirming(false);
          }}
          trigger={<Button variant="outline">Abrir confirmación</Button>}
        />
        {confirmed ? <p role="status">Acción de muestra completada.</p> : null}
        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="font-medium">Historial de pagos · muestra</h2>
          <fieldset disabled className="min-w-0">
            <legend className="sr-only">Pagos de muestra, acciones deshabilitadas</legend>
            <MemberPaymentsTable payments={payments} />
          </fieldset>
          <ListPagination
            pageInfo={{ page: paymentPage, pageSize: 25, total: totalPayments, totalPages }}
            path="/dev/component-composition"
            filters={{ data: mode }}
          />
        </section>
        <fieldset disabled className="min-w-0">
          <legend className="sr-only">Ficha de lectura</legend>
          <MemberProfile {...profile} />
        </fieldset>
        <div
          key={`training-${mode}`}
          className="flex h-[42rem] min-w-0 flex-col rounded-lg bg-card"
          onSubmitCapture={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <TrainingForm
            types={empty ? [] : [{ id: "directed", name: label }]}
            training={
              empty
                ? undefined
                : {
                    id: "demo",
                    name: label,
                    classTypeId: "directed",
                    hasAssignedClasses: false,
                    phases: [
                      {
                        name: mode === "one" ? "J" : label,
                        blocks: [
                          {
                            body: worst
                              ? "4 rondas: 12 repeticiones, descanso de 90 segundos.\nAjustar la carga al nivel del grupo."
                              : "1 ronda",
                          },
                        ],
                      },
                    ],
                  }
            }
          />
        </div>
      </div>
      <nav
        aria-label="Datos de prueba"
        className="fixed inset-x-2 bottom-2 flex flex-wrap justify-center gap-1 rounded-md border bg-muted p-2 text-foreground"
      >
        {modes.map((item) => (
          <Button key={item} size="sm" variant={item === mode ? "secondary" : "ghost"} onClick={() => changeMode(item)}>
            {
              {
                demo: "Demo data",
                worst: "Worst case",
                empty: "Empty",
                one: "One",
                pending: "Pending",
              }[item]
            }
          </Button>
        ))}
      </nav>
    </main>
  );
}
