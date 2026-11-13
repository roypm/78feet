import { useParams } from "react-router";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { NavigationLink as Link } from "@/components/common/navigation/navigation-link";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
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
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/calendario" missing="member">
      {(training) => (
        <ModulePage>
          <ModuleHeader
            title={training.name}
            description={training.classType.name}
            eyebrow={<Link href="/biblioteca" className="text-sm text-primary">Biblioteca</Link>}
          />
          <ModuleBody>
            <TrainingRead name={training.name} classTypeName={training.classType.name} phases={training.phases} showHeading={false} />
          </ModuleBody>
        </ModulePage>
      )}
    </QueryBody>
  );
}
