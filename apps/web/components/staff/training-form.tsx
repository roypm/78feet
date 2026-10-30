"use client";

import { PendingButton } from "@/components/feedback/pending-button";
import { EmptyState } from "@/components/feedback/empty-state";

import { useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/box/api";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, controlClass } from "@/components/staff/field";
import { FormDialog } from "@/components/staff/form-dialog";
import { TrainingRead } from "@/components/box/training-read";

type Phase = { name: string; blocks: { body: string }[] };
type Confirmation = { mode: "impact" | "detach"; description: string };

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

function StructureActions({
  label,
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveUp,
  canMoveDown,
  canRemove,
}: {
  label: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canRemove: boolean;
}) {
  const touchTarget = "min-h-11 min-w-11 sm:min-h-8 sm:min-w-8";
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={touchTarget}
        aria-label={`Subir ${label.toLowerCase()}`}
        title={`Subir ${label.toLowerCase()}`}
        disabled={!canMoveUp}
        onClick={onMoveUp}
      >
        <ChevronUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={touchTarget}
        aria-label={`Bajar ${label.toLowerCase()}`}
        title={`Bajar ${label.toLowerCase()}`}
        disabled={!canMoveDown}
        onClick={onMoveDown}
      >
        <ChevronDown />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={`${touchTarget} text-muted-foreground pointer-hover:text-destructive`}
        aria-label={`Quitar ${label.toLowerCase()}`}
        title={`Quitar ${label.toLowerCase()}`}
        disabled={!canRemove}
        onClick={onRemove}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

export function TrainingForm({
  types,
  training,
}: {
  types: { id: string; name: string }[];
  training?: {
    id: string;
    name: string;
    classTypeId: string;
    phases: { name: string; blocks: { body: string }[] }[];
    hasAssignedClasses: boolean;
  };
}) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [previewing, setPreviewing] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [name, setName] = useState(training?.name ?? "");
  const [classTypeId, setClassTypeId] = useState(training?.classTypeId ?? types[0]?.id ?? "");
  const [phases, setPhases] = useState<Phase[]>(training?.phases ?? []);
  const hasChanges = training
    ? name.trim() !== training.name ||
      classTypeId !== training.classTypeId ||
      JSON.stringify(phases) !== JSON.stringify(training.phases)
    : true;

  async function save(confirmDetach = false) {
    if (!begin()) return;
    const body = { name, classTypeId, phases, confirmDetach };
    const path = training ? `/api/v1/admin/trainings/${training.id}` : "/api/v1/admin/trainings";
    try {
      const result = await api<{ training?: { id: string }; id?: string; detachedCount?: number }>(path, {
        method: training ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      const id = training?.id ?? result.training?.id ?? result.id;
      toast.success(result.detachedCount ? `Guardado. ${result.detachedCount} clases se quedan sin plan.` : "Entrenamiento guardado");
      setConfirmation(null);
      router.push(`/staff/biblioteca/${id}`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === "CONFIRM_REQUIRED") {
        setConfirmation({ mode: "detach", description: error.message });
      } else {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar");
      }
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Escribe el nombre del entrenamiento");
      setPreviewing(false);
      return;
    }
    if (!classTypeId) {
      toast.error("Elige un tipo dirigido");
      setPreviewing(false);
      return;
    }
    if (phases.length === 0) {
      toast.error("Añade al menos una fase");
      setPreviewing(false);
      return;
    }
    const invalidPhase = phases.find((phase) => !phase.name.trim() || phase.blocks.length === 0 || phase.blocks.some((block) => !block.body.trim()));
    if (invalidPhase) {
      toast.error("Completa el nombre de cada fase y sus indicaciones");
      setPreviewing(false);
      return;
    }

    if (training?.hasAssignedClasses && hasChanges && classTypeId === training.classTypeId) {
      setConfirmation({
        mode: "impact",
        description:
          "El nombre y el contenido se actualizarán en las clases vinculadas, incluidas las pasadas. Puedes volver a revisar el entrenamiento antes de confirmar.",
      });
      return;
    }
    void save();
  }

  function confirmSave() {
    if (!confirmation) return;
    void save(confirmation.mode === "detach");
  }

  function cancel() {
    router.push(training ? `/staff/biblioteca/${training.id}` : "/staff/biblioteca");
  }

  function startBlank() {
    setPhases([{ name: "", blocks: [{ body: "" }] }]);
  }

  function startSuggestedStructure() {
    setPhases([
      { name: "Calentamiento", blocks: [{ body: "" }] },
      { name: "Fuerza / técnica", blocks: [{ body: "" }] },
      { name: "WOD", blocks: [{ body: "" }] },
      { name: "Vuelta a la calma", blocks: [{ body: "" }] },
    ]);
  }

  const selectedTypeName = types.find((type) => type.id === classTypeId)?.name;

  return (
    <>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <fieldset disabled={pending} aria-busy={pending} className="contents">
          <div role="tablist" aria-label="Modo del entrenamiento" className="flex w-fit rounded-md bg-muted p-0.5">
            <Button
              type="button"
              role="tab"
              aria-selected={!previewing}
              variant={!previewing ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setPreviewing(false)}
            >
              Editar
            </Button>
            <Button
              type="button"
              role="tab"
              aria-selected={previewing}
              variant={previewing ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setPreviewing(true)}
            >
              Vista previa
            </Button>
          </div>

          {!previewing ? (
            <div role="tabpanel" className="flex flex-col gap-6">
              <Field label="Nombre del entrenamiento">
                <Input value={name} onChange={(event) => setName(event.target.value)} required />
              </Field>
              <Field label="Tipo de clase dirigida">
                <select
                  value={classTypeId}
                  onChange={(event) => setClassTypeId(event.target.value)}
                  required
                  className={controlClass}
                >
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="text-sm text-muted-foreground">
                Ordena la sesión por fases. En cada bloque, escribe las indicaciones que necesita el grupo: series y
                repeticiones, carga o intensidad, descansos y tiempo límite cuando corresponda.
              </p>

              {training?.hasAssignedClasses ? (
                <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                  Si guardas cambios de nombre o contenido, también se mostrarán en las clases que ya usan este entrenamiento.
                  Cambiar el tipo puede dejar clases incompatibles sin plan.
                </p>
              ) : null}

              {phases.length === 0 ? (
                <EmptyState
                  compact
                  title="Empezá a estructurar la sesión"
                  description="Podés usar una fase libre o partir de una propuesta y adaptarla."
                >
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" className="min-h-11" onClick={startBlank}>
                      Empezar en blanco
                    </Button>
                    <Button type="button" variant="secondary" className="min-h-11" onClick={startSuggestedStructure}>
                      Usar estructura habitual
                    </Button>
                  </div>
                </EmptyState>
              ) : (
                <div className="flex flex-col gap-4">
                  {phases.map((phase, phaseIndex) => (
                    <section key={phaseIndex} className="flex flex-col gap-4 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Fase {phaseIndex + 1}
                        </span>
                        <StructureActions
                          label="fase"
                          canMoveUp={phaseIndex > 0}
                          canMoveDown={phaseIndex < phases.length - 1}
                          canRemove={phases.length > 1}
                          onMoveUp={() => setPhases(moveItem(phases, phaseIndex, -1))}
                          onMoveDown={() => setPhases(moveItem(phases, phaseIndex, 1))}
                          onRemove={() => setPhases(phases.filter((_, index) => index !== phaseIndex))}
                        />
                      </div>
                      <Field label="Nombre de la fase">
                        <Input
                          value={phase.name}
                          placeholder="Ej.: Calentamiento, Fuerza, WOD"
                          onChange={(event) => {
                            const next = [...phases];
                            next[phaseIndex] = { ...phase, name: event.target.value };
                            setPhases(next);
                          }}
                          required
                        />
                      </Field>
                      <div className="flex flex-col gap-3">
                        {phase.blocks.map((block, blockIndex) => (
                          <Field key={blockIndex} label={`Indicaciones · bloque ${blockIndex + 1}`}>
                            <div className="mb-1 flex justify-end">
                              <StructureActions
                                label="bloque"
                                canMoveUp={blockIndex > 0}
                                canMoveDown={blockIndex < phase.blocks.length - 1}
                                canRemove={phase.blocks.length > 1}
                                onMoveUp={() => {
                                  const next = [...phases];
                                  next[phaseIndex] = { ...phase, blocks: moveItem(phase.blocks, blockIndex, -1) };
                                  setPhases(next);
                                }}
                                onMoveDown={() => {
                                  const next = [...phases];
                                  next[phaseIndex] = { ...phase, blocks: moveItem(phase.blocks, blockIndex, 1) };
                                  setPhases(next);
                                }}
                                onRemove={() => {
                                  const next = [...phases];
                                  next[phaseIndex] = {
                                    ...phase,
                                    blocks: phase.blocks.filter((_, index) => index !== blockIndex),
                                  };
                                  setPhases(next);
                                }}
                              />
                            </div>
                            <Textarea
                              rows={4}
                              value={block.body}
                              placeholder={"Ej.: 4 rondas\n12 repeticiones\nDescanso 90 s"}
                              onChange={(event) => {
                                const next = [...phases];
                                const blocks = [...phase.blocks];
                                blocks[blockIndex] = { body: event.target.value };
                                next[phaseIndex] = { ...phase, blocks };
                                setPhases(next);
                              }}
                              required
                            />
                          </Field>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 self-start"
                        onClick={() => {
                          const next = [...phases];
                          next[phaseIndex] = { ...phase, blocks: [...phase.blocks, { body: "" }] };
                          setPhases(next);
                        }}
                      >
                        Añadir indicaciones
                      </Button>
                    </section>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11 self-start"
                    onClick={() => setPhases([...phases, { name: "", blocks: [{ body: "" }] }])}
                  >
                    Añadir fase
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <section role="tabpanel" className="flex flex-col gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
              <div>
                <h2 className="font-medium">Vista del socio</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Así se organiza el entrenamiento que verá al abrir la clase.
                </p>
              </div>
              {phases.length > 0 ? (
                <TrainingRead name={name || "Nombre del entrenamiento"} classTypeName={selectedTypeName} phases={phases} />
              ) : (
                <EmptyState
                  compact
                  title="Todavía no hay contenido para previsualizar"
                  description="Volvé al editor y añadí la primera fase."
                >
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => setPreviewing(false)}>
                    Volver a editar
                  </Button>
                </EmptyState>
              )}
            </section>
          )}

          <div className="sticky bottom-0 z-10 -mx-4 mt-2 flex flex-wrap items-center justify-between gap-2 border-t bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm md:-mx-6 md:px-6">
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={cancel}>
              Cancelar
            </Button>
            {previewing ? (
              <Button type="button" className="min-h-11" onClick={() => setPreviewing(false)}>
                Volver a editar
              </Button>
            ) : (
              <PendingButton
                type="submit"
                className="min-h-11"
                disabled={pending || types.length === 0 || phases.length === 0 || !hasChanges}
                pending={pending}
                pendingLabel={"Guardando…"}
              >
                {training ? "Guardar cambios" : "Guardar entrenamiento"}
              </PendingButton>
            )}
          </div>
        </fieldset>
      </form>

      <FormDialog
        open={confirmation !== null}
        onOpenChange={(open) => { if (!open && !pending) setConfirmation(null); }}
        busy={pending}
        title={confirmation?.mode === "detach" ? "Cambiar el tipo de clase" : "Actualizar el entrenamiento"}
        description={confirmation?.mode === "detach"
          ? `${confirmation.description}. Las clases incompatibles perderán este plan.`
          : confirmation?.description ?? ""}
      >
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirmation(null)}>
            Revisar
          </Button>
          <PendingButton type="button" disabled={pending} onClick={confirmSave} pending={pending} pendingLabel={"Guardando…"}>
            {confirmation?.mode === "detach" ? "Cambiar tipo y guardar" : "Actualizar clases"}
          </PendingButton>
        </DialogFooter>
      </FormDialog>
    </>
  );
}
