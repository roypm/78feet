"use client";

import { PendingButton } from "@/components/feedback/pending-button";

import { EmptyState } from "@/components/feedback/empty-state";

import { useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { addDays, type BoxHoursConfig } from "@78feet/domain";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/staff/field";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

type Interval = BoxHoursConfig["weekly"][number]["intervals"][number];

function newInterval(): Interval {
  return { openTime: "", closeTime: "" };
}

export function HoursForm({ initialConfig, today }: { initialConfig: BoxHoursConfig; today: string }) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [config, setConfig] = useState(initialConfig);

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
      await api("/api/v1/admin/hours", {
        method: "PATCH",
        body: JSON.stringify(config),
      });
      toast.success("Horario actualizado. El cambio ya está en vigor.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el horario");
    } finally {
      setPending(false);
    }
  }

  return (
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
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {config.weekly
                .slice()
                .sort((a, b) => a.weekday - b.weekday)
                .map((day) => (
                  <div key={day.weekday} className="rounded-lg border border-border bg-surface p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-medium">{DAYS[day.weekday - 1]}</h3>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-10"
                        onClick={() => updateDay(day.weekday, (intervals) => [...intervals, newInterval()])}
                      >
                        Añadir tramo
                      </Button>
                    </div>
                    {day.intervals.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Cerrado todo el día</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {day.intervals.map((interval, index) => (
                          <div
                            key={`${day.weekday}-${index}`}
                            className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                          >
                            <Field label={`Tramo ${index + 1}: abre`}>
                              <Input
                                type="time"
                                required
                                aria-label={`${DAYS[day.weekday - 1]}, tramo ${index + 1}, apertura`}
                                value={interval.openTime}
                                onChange={(event) =>
                                  updateDay(day.weekday, (items) =>
                                    items.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, openTime: event.target.value } : item,
                                    ),
                                  )
                                }
                              />
                            </Field>
                            <Field label="Cierra">
                              <Input
                                type="time"
                                required
                                aria-label={`${DAYS[day.weekday - 1]}, tramo ${index + 1}, cierre`}
                                value={interval.closeTime}
                                onChange={(event) =>
                                  updateDay(day.weekday, (items) =>
                                    items.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, closeTime: event.target.value } : item,
                                    ),
                                  )
                                }
                              />
                            </Field>
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
                  Cambian el horario habitual solo ese día. Sin tramos, el box queda cerrado.
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
                      <Field label="Fecha">
                        <Input
                          type="date"
                          required
                          min={today}
                          value={exception.date}
                          onChange={(event) => {
                            const date = event.target.value;
                            if (config.exceptions.some((item, itemIndex) => itemIndex !== index && item.date === date)) {
                              toast.error("Ya hay una excepción para esa fecha");
                              return;
                            }
                            updateException(index, (item) => ({ ...item, date }));
                          }}
                        />
                      </Field>
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
                            <Field label={`Tramo ${intervalIndex + 1}: abre`}>
                              <Input
                                type="time"
                                required
                                aria-label={`${exception.date}, tramo ${intervalIndex + 1}, apertura`}
                                value={interval.openTime}
                                onChange={(event) =>
                                  updateException(index, (item) => ({
                                    ...item,
                                    intervals: item.intervals.map((current, currentIndex) =>
                                      currentIndex === intervalIndex ? { ...current, openTime: event.target.value } : current,
                                    ),
                                  }))
                                }
                              />
                            </Field>
                            <Field label="Cierra">
                              <Input
                                type="time"
                                required
                                aria-label={`${exception.date}, tramo ${intervalIndex + 1}, cierre`}
                                value={interval.closeTime}
                                onChange={(event) =>
                                  updateException(index, (item) => ({
                                    ...item,
                                    intervals: item.intervals.map((current, currentIndex) =>
                                      currentIndex === intervalIndex ? { ...current, closeTime: event.target.value } : current,
                                    ),
                                  }))
                                }
                              />
                            </Field>
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
  );
}
