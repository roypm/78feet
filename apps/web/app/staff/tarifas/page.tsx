import { TariffsPanel } from "@/components/tariffs/tariffs-panel";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { listTariffs } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Tarifas" />
    <ModuleBody width="full" inset="content">
      <LoadingState variant="table" label="Cargando tarifas…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const { account, query } = useAccountQuery(["tariffs"], () => listTariffs());
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/staff/hoy">
      {(tariffs) => (
        <ModulePage>
          <ModuleHeader title="Tarifas" description="Cupos semanales y precios que se asignan a los socios." />
          <ModuleBody width="full" inset="content">
            <TariffsPanel tariffs={tariffs} />
          </ModuleBody>
        </ModulePage>
      )}
    </QueryBody>
  );
}
