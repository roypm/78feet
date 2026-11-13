import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { NavigationLink as Link } from "@/components/common/navigation/navigation-link";
import { StaffCrumbs } from "@/components/common/navigation/staff-crumbs";
import { TrainingDeleteButton } from "@/components/trainings/training-delete-button";
import { TrainingRead } from "@/components/trainings/training-read";
import { getTraining } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Biblioteca" />
    <ModuleBody>
      <LoadingState variant="training" label="Cargando el entrenamiento…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const { id = "" } = useParams();
  const { account, query } = useAccountQuery(["training", id], () => getTraining(id));
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/staff/hoy" missing="staff">
      {(training) => (
        <ModulePage>
          <ModuleHeader
            title={training.name}
            description={training.classType.name}
            eyebrow={<StaffCrumbs items={[{ href: "/staff/biblioteca", label: "Biblioteca" }, { label: training.name }]} />}
          />
          <ModuleBody>
            <div className="flex flex-wrap items-center gap-2">
              <Button nativeButton={false} variant="outline" className="min-h-11" render={<Link href={`/staff/biblioteca/${training.id}/editar`} />}>
                Editar
              </Button>
              <TrainingDeleteButton trainingId={training.id} />
            </div>
            <p className="text-sm text-muted-foreground">
              Se asigna desde la ficha de cada clase. Los cambios de nombre y contenido se reflejan en las clases vinculadas, también en las pasadas; al cambiar el tipo, las clases incompatibles pierden el plan.
            </p>
            <TrainingRead name={training.name} classTypeName={training.classType.name} phases={training.phases} showHeading={false} />
          </ModuleBody>
        </ModulePage>
      )}
    </QueryBody>
  );
}
