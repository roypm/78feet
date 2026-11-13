import { useParams } from "react-router";
import { TrainingForm } from "@/components/trainings/training-form";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { StaffCrumbs } from "@/components/common/navigation/staff-crumbs";
import { getTraining, listClassTypes } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Editar entrenamiento" />
    <ModuleBody>
      <LoadingState variant="form" label="Cargando el entrenamiento…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const { id = "" } = useParams();
  const { account, query } = useAccountQuery(["training", "edit", id], async () => {
    const training = await getTraining(id);
    const types = (await listClassTypes()).filter((type) => type.kind === "directed");
    return { training, types };
  });
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/staff/hoy" missing="staff">
      {({ training, types }) => (
        <ModulePage>
          <ModuleHeader
            title={`Editar · ${training.name}`}
            description={training.classType.name}
            eyebrow={
              <StaffCrumbs
                items={[
                  { href: "/staff/biblioteca", label: "Biblioteca" },
                  { href: `/staff/biblioteca/${training.id}`, label: training.name },
                  { label: "Editar" },
                ]}
              />
            }
          />
          <ModuleBody fill>
            <TrainingForm
              types={types}
              training={{
                id: training.id,
                name: training.name,
                classTypeId: training.classTypeId,
                phases: training.phases.map((phase) => ({
                  name: phase.name,
                  blocks: phase.blocks.map((block) => ({ body: block.body })),
                })),
                hasAssignedClasses: training.hasAssignedClasses,
              }}
            />
          </ModuleBody>
        </ModulePage>
      )}
    </QueryBody>
  );
}
