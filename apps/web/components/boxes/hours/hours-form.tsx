import { TimePicker } from "@/components/common/forms/time-picker";
import { DatePicker } from "@/components/common/forms/date-picker";

import { PendingButton } from "@/components/common/feedback/pending-button";

import { EmptyState } from "@/components/common/feedback/empty-state";

import { useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { addDays, type BoxHoursConfig } from "@78feet/domain";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/common/dialogs/form-dialog";
import { FormActions } from "@/components/common/forms/form-actions";
import { copyWeeklyHours } from "@/lib/box/hours-draft";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

type Interval = BoxHoursConfig["weekly"][number]["intervals"][number];

function newInterval(): Interval {
  return { openTime: "", closeTime: "" };
}

export function HoursForm({ initialConfig, today, boxId }: { initialConfig: BoxHoursConfig; today: string; boxId: string }) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [config, setConfig] = useState(initialConfig);
  const [copyFrom, setCopyFrom] = useState<number | null>(null);
  const [copyTargets, setCopyTargets] = useState<number[]>([]);
  const copySource = config.weekly.find((day) => day.weekday === copyFrom);

  function updateDay(weekday: number, update: (intervals: Interval[]) => Interval[]) {
    setConfig((current) => ({
      ...current,
      weekly: current.weekly.map((day) =>
        day.weekday === weekday ? { ...day, intervals: update(day.intervals) } : day,
      ),
    }));
  }

  function updateException(index: number, update: (exception: BoxHoursConfig["exceptions"][number]) => BoxHoursConfig["exceptions"][number]) {
    setConfig((current) => ({
      ...current,
      exceptions: current.exceptions.map((exception, itemIndex) =>
        itemIndex === index ? update(exception) : exception,
      ),
    }));
  }

  function addException() {
    const date = addDays(today, 1);
    if (config.exceptions.some((exception) => exception.date === date)) {
      toast.error("Ya hay una excepción para mañana");
      return;
    }
    const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay() || 7;
    const intervals = config.weekly.find((day) => day.weekday === weekday)?.intervals ?? [];
    setConfig((current) => ({
      ...current,
      exceptions: [...current.exceptions, { date, intervals: intervals.map((interval) => ({ ...interval })) }].sort(
        (a, b) => a.date.localeCompare(b.date),
      ),
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!begin()) return;
    try {
      await api(`/api/v1/admin/hours?box=${boxId}`, {
        method: "PATCH",
        body: JSON.stringify(config),
      });
      toast.success("Horario actualizado. El cambio ya está en vigor.");
      router.refresh("catalog");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el horario");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
    <form onSubmit={(event) => void onSubmit(event)} className="flex w-full min-w-0 flex-col gap-8">
        <fieldset disabled={pending} aria-busy={pending} className="contents">
          <section className="flex flex-col gap-3" aria-labelledby="weekly-hours-title">
            <div>
              <h2 id="weekly-hours-title" className="font-semibold">
                Horario habitual
              </h2>
              <p className="text-sm text-muted-foreground">
                Añadí uno o más tramos por día. Un día sin tramos permanece cerrado. Los cambios se aplican al guardar.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {config.weekly
                .slice()
                .sort((a, b) => a.weekday - b.weekday)
                .map((day) => (
                  <div key={day.weekday} className="rounded-lg border border-border bg-surface p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-medium">{DAYS[day.weekday - 1]}</h3>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-10"
                          aria-label={`Copiar horario de ${DAYS[day.weekday - 1]}`}
                          onClick={() => {
                            setCopyTargets([]);
                            setCopyFrom(day.weekday);
                          }}
                        >
                          Copiar horario
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-10"
                          onClick={() => updateDay(day.weekday, (intervals) => [...intervals, newInterval()])}
                        >
                          Añadir tramo
                        </Button>
                      </div>
                    </div>
                    {day.intervals.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Cerrado todo el día</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {day.intervals.map((interval, index) => (
                          <div
                            key={`${day.weekday}-${index}`}
                            className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                          >
                            <TimePicker label={`Tramo ${index + 1}: abre`} disabled={pending}
                              required
                              aria-label={`${DAYS[day.weekday - 1]}, tramo ${index + 1}, apertura`}
                              value={interval.openTime}
                              onValueChange={(value) =>
                                updateDay(day.weekday, (items) =>
                                  items.map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, openTime: value } : item,
                                  ),
                                )
                              }
                            />
                            <TimePicker label="Cierra" disabled={pending}
                              required
                              aria-label={`${DAYS[day.weekday - 1]}, tramo ${index + 1}, cierre`}
                              value={interval.closeTime}
                              onValueChange={(value) =>
                                updateDay(day.weekday, (items) =>
                                  items.map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, closeTime: value } : item,
                                  ),
                                )
                              }
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="col-span-2 min-h-10 sm:col-span-1"
                              aria-label={`Quitar tramo ${index + 1} de ${DAYS[day.weekday - 1]}`}
                              onClick={() =>
                                updateDay(day.weekday, (items) => items.filter((_, itemIndex) => itemIndex !== index))
                              }
                            >
                              Quitar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="date-exceptions-title">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 id="date-exceptions-title" className="font-semibold">
                  Excepciones por fecha
                </h2>
                <p className="text-sm text-muted-foreground">
                  Al añadir una fecha, se copian los tramos habituales de ese día; podés ajustarlos o quitarlos para cerrar.
                </p>
              </div>
              <Button type="button" variant="outline" className="min-h-10" onClick={addException}>
                Añadir fecha
              </Button>
            </div>
            {config.exceptions.length === 0 ? (
              <EmptyState
                compact
                title="No hay fechas especiales"
                description="Se aplica el horario habitual. Añadí una fecha si necesitás cambiar los tramos o cerrar un día concreto."
              >
                <Button type="button" variant="outline" className="min-h-11" onClick={addException}>
                  Añadir fecha
                </Button>
              </EmptyState>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {config.exceptions.map((exception, index) => (
                  <div key={`${exception.date}-${index}`} className="rounded-lg border border-border bg-surface p-4">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                      <DatePicker label="Fecha" disabled={pending}
                        required
                        min={today}
                        value={exception.date}
                        onValueChange={(value) => {
                          const date = value;
                          if (config.exceptions.some((item, itemIndex) => itemIndex !== index && item.date === date)) {
                            toast.error("Ya hay una excepción para esa fecha");
                            return;
                          }
                          updateException(index, (item) => ({ ...item, date }));
                        }}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-10"
                          onClick={() =>
                            updateException(index, (item) => ({ ...item, intervals: [...item.intervals, newInterval()] }))
                          }
                        >
                          Añadir tramo
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-10"
                          onClick={() =>
                            setConfig((current) => ({
                              ...current,
                              exceptions: current.exceptions.filter((_, itemIndex) => itemIndex !== index),
                            }))
                          }
                        >
                          Quitar fecha
                        </Button>
                      </div>
                    </div>
                    {exception.intervals.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Cerrado todo el día</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {exception.intervals.map((interval, intervalIndex) => (
                          <div
                            key={`${exception.date}-${intervalIndex}`}
                            className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                          >
                            <TimePicker label={`Tramo ${intervalIndex + 1}: abre`} disabled={pending}
                              required
                              aria-label={`${exception.date}, tramo ${intervalIndex + 1}, apertura`}
                              value={interval.openTime}
                              onValueChange={(value) =>
                                updateException(index, (item) => ({
                                  ...item,
                                  intervals: item.intervals.map((current, currentIndex) =>
                                    currentIndex === intervalIndex ? { ...current, openTime: value } : current,
                                  ),
                                }))
                              }
                            />
                            <TimePicker label="Cierra" disabled={pending}
                              required
                              aria-label={`${exception.date}, tramo ${intervalIndex + 1}, cierre`}
                              value={interval.closeTime}
                              onValueChange={(value) =>
                                updateException(index, (item) => ({
                                  ...item,
                                  intervals: item.intervals.map((current, currentIndex) =>
                                    currentIndex === intervalIndex ? { ...current, closeTime: value } : current,
                                  ),
                                }))
                              }
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="col-span-2 min-h-10 sm:col-span-1"
                              aria-label={`Quitar tramo ${intervalIndex + 1} de ${exception.date}`}
                              onClick={() =>
                                updateException(index, (item) => ({
                                  ...item,
                                  intervals: item.intervals.filter((_, currentIndex) => currentIndex !== intervalIndex),
                                }))
                              }
                            >
                              Quitar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <PendingButton
            type="submit"
            className="min-h-11 self-start"
            disabled={pending}
            pending={pending}
            pendingLabel={"Guardando…"}
          >
            {"Guardar horario"}
          </PendingButton>
        </fieldset>
      </form>
      <FormDialog
        open={copyFrom !== null}
        onOpenChange={(open) => { if (!open) setCopyFrom(null); }}
        title={`Copiar horario de ${copyFrom === null ? "" : DAYS[copyFrom - 1]}`}
        description="Reemplaza los tramos de los días que elijas. Los cambios se aplican al guardar el horario."
      >
        <form className="flex flex-col gap-4" onSubmit={(event) => {
          event.preventDefault();
          if (pending || copyFrom === null || copyTargets.length === 0) return;
          setConfig((current) => copyWeeklyHours(current, copyFrom, copyTargets));
          setCopyFrom(null);
        }}>
          <p className="text-sm text-muted-foreground">
            {copySource?.intervals.length
              ? copySource.intervals.map((interval) => `${interval.openTime || "—"}–${interval.closeTime || "—"}`).join(" · ")
              : "Cerrado todo el día"}
          </p>
          <fieldset disabled={pending} className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Copiar a</legend>
            {DAYS.map((name, index) => index + 1 === copyFrom ? null : (
              <div key={name} className="flex min-h-11 items-center justify-between gap-3">
                <Label htmlFor={`copy-hours-${index + 1}`} className="flex min-h-11 flex-1 items-center">{name}</Label>
                <Switch id={`copy-hours-${index + 1}`} checked={copyTargets.includes(index + 1)}
                  onCheckedChange={(checked) => setCopyTargets((current) =>
                    checked ? [...current, index + 1] : current.filter((day) => day !== index + 1),
                  )} />
              </div>
            ))}
          </fieldset>
          <FormActions pending={pending} submitDisabled={copyTargets.length === 0}
            onCancel={() => setCopyFrom(null)} submitLabel="Copiar horario" />
        </form>
      </FormDialog>
    </>
  );
}
