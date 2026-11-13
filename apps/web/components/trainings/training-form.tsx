import { PendingButton } from "@/components/common/feedback/pending-button";
import { EmptyState } from "@/components/common/feedback/empty-state";

import { useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { TRAINING_NAME_TAKEN } from "@78feet/domain";
import { api, ApiError } from "@/lib/box/api";
import { Button } from "@/components/ui/button";
import { FormInput, FormTextarea } from "@/components/common/forms/form-control";
import { FormSelect } from "@/components/common/forms/form-select";
import { ConfirmDialog } from "@/components/common/dialogs/confirm-dialog";
import { useNewTrainingVisit } from "@/components/trainings/new-training-visit";
import { TrainingRead } from "@/components/trainings/training-read";

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

function TrainingPhaseEditor({
  phase,
  phaseIndex,
  canMoveUp,
  canMoveDown,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  phase: Phase;
  phaseIndex: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (phase: Phase) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fase {phaseIndex + 1}</span>
        <StructureActions
          label="fase"
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          canRemove
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onRemove={onRemove}
        />
      </div>
      <FormInput
        label="Nombre de la fase"
        value={phase.name}
        placeholder="Ej.: Calentamiento, Fuerza, WOD"
        onChange={(event) => onChange({ ...phase, name: event.target.value })}
        required
      />
      <div className="flex flex-col gap-3">
        {phase.blocks.map((block, blockIndex) => (
          <FormTextarea
            key={blockIndex}
            label={`Indicaciones · bloque ${blockIndex + 1}`}
            header={
              <div className="flex justify-end">
                <StructureActions
                  label="bloque"
                  canMoveUp={blockIndex > 0}
                  canMoveDown={blockIndex < phase.blocks.length - 1}
                  canRemove={phase.blocks.length > 1}
                  onMoveUp={() =>
                    onChange({
                      ...phase,
                      blocks: moveItem(phase.blocks, blockIndex, -1),
                    })
                  }
                  onMoveDown={() =>
                    onChange({
                      ...phase,
                      blocks: moveItem(phase.blocks, blockIndex, 1),
                    })
                  }
                  onRemove={() =>
                    onChange({
                      ...phase,
                      blocks: phase.blocks.filter((_, index) => index !== blockIndex),
                    })
                  }
                />
              </div>
            }
            rows={4}
            value={block.body}
            placeholder={"Ej.: 4 rondas\n12 repeticiones\nDescanso 90 s"}
            onChange={(event) =>
              onChange({
                ...phase,
                blocks: phase.blocks.map((item, index) => (index === blockIndex ? { body: event.target.value } : item)),
              })
            }
            required
          />
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 self-start"
        onClick={() => onChange({ ...phase, blocks: [...phase.blocks, { body: "" }] })}
      >
        Añadir indicaciones
      </Button>
    </section>
  );
}

type TrainingFormProps = {
  types: { id: string; name: string }[];
  training?: {
    id: string;
    name: string;
    classTypeId: string;
    phases: { name: string; blocks: { body: string }[] }[];
    hasAssignedClasses: boolean;
  };
};

export function TrainingForm(props: TrainingFormProps) {
  const visit = useNewTrainingVisit();
  return <TrainingEditor key={props.training?.id ?? `nuevo-${visit}`} {...props} />;
}

function TrainingEditor({ types, training }: TrainingFormProps) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [previewing, setPreviewing] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [name, setName] = useState(training?.name ?? "");
  const [nameError, setNameError] = useState("");
  const [classTypeId, setClassTypeId] = useState(training?.classTypeId ?? "");
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
      const result = await api<{
        training?: { id: string };
        id?: string;
        detachedCount?: number;
      }>(path, {
        method: training ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      const id = training?.id ?? result.training?.id ?? result.id;
      toast.success(
        result.detachedCount
          ? `Guardado. ${result.detachedCount} clases se quedan sin plan.`
          : "Entrenamiento guardado",
      );
      setConfirmation(null);
      router.push(`/staff/biblioteca/${id}`);
      router.refresh("training");
    } catch (error) {
      if (error instanceof ApiError && error.code === "CONFIRM_REQUIRED") {
        setConfirmation({ mode: "detach", description: error.message });
      } else if (error instanceof ApiError && error.message === TRAINING_NAME_TAKEN) {
        setConfirmation(null);
        setPreviewing(false);
        setNameError(TRAINING_NAME_TAKEN);
      } else {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar");
      }
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phases.length === 0) {
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
    <div className="flex min-h-0 flex-1 flex-col">
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <fieldset disabled={pending} aria-busy={pending} className="contents">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6">
            <div className="flex w-full max-w-2xl flex-col gap-4">
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
                  <FormInput
                    label="Nombre del entrenamiento"
                    value={name}
                    error={nameError}
                    onChange={(event) => {
                      setName(event.target.value);
                      setNameError("");
                    }}
                  />
                  <FormSelect
                    label="Tipo de clase dirigida"
                    value={classTypeId}
                    onValueChange={setClassTypeId}
                    required
                    disabled={pending}
                    options={[
                      { value: "", label: "Elegí un tipo de clase…" },
                      ...types.map((type) => ({
                        value: type.id,
                        label: type.name,
                      })),
                    ]}
                  />
                  <p className="text-sm text-muted-foreground">
                    Ordena la sesión por fases. En cada bloque, escribe las indicaciones que necesita el grupo: series y
                    repeticiones, carga o intensidad, descansos y tiempo límite cuando corresponda.
                  </p>

                  {training?.hasAssignedClasses ? (
                    <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                      Si guardas cambios de nombre o contenido, también se mostrarán en las clases que ya usan este
                      entrenamiento. Cambiar el tipo puede dejar clases incompatibles sin plan.
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
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-11"
                          onClick={startSuggestedStructure}
                        >
                          Usar estructura habitual
                        </Button>
                      </div>
                    </EmptyState>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {phases.map((phase, phaseIndex) => (
                        <TrainingPhaseEditor
                          key={phaseIndex}
                          phase={phase}
                          phaseIndex={phaseIndex}
                          canMoveUp={phaseIndex > 0}
                          canMoveDown={phaseIndex < phases.length - 1}
                          onChange={(next) =>
                            setPhases(phases.map((item, index) => (index === phaseIndex ? next : item)))
                          }
                          onMoveUp={() => setPhases(moveItem(phases, phaseIndex, -1))}
                          onMoveDown={() => setPhases(moveItem(phases, phaseIndex, 1))}
                          onRemove={() => setPhases(phases.filter((_, index) => index !== phaseIndex))}
                        />
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
                <section
                  role="tabpanel"
                  className="flex flex-col gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10"
                >
                  <div>
                    <h2 className="font-medium">Vista del socio</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Así se organiza el entrenamiento que verá al abrir la clase.
                    </p>
                  </div>
                  {phases.length > 0 ? (
                    <TrainingRead
                      name={name || "Nombre del entrenamiento"}
                      classTypeName={selectedTypeName}
                      phases={phases}
                    />
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
            </div>
          </div>

          <div className="shrink-0 border-t bg-background px-4 py-3 md:px-6">
            <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-2">
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
          </div>
        </fieldset>
      </form>

      <ConfirmDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
        busy={pending}
        title={confirmation?.mode === "detach" ? "Cambiar el tipo de clase" : "Actualizar el entrenamiento"}
        description={
          confirmation?.mode === "detach"
            ? `${confirmation.description}. Las clases incompatibles perderán este plan.`
            : (confirmation?.description ?? "")
        }
        cancelLabel="Revisar"
        confirmLabel={confirmation?.mode === "detach" ? "Cambiar tipo y guardar" : "Actualizar clases"}
        busyLabel="Guardando…"
        onConfirm={confirmSave}
      />
    </div>
  );
}
