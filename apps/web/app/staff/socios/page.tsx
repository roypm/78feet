import { useSearchParams } from "react-router";
import { CreateMemberAltaButton } from "@/components/members/member-forms";
import { MembersTable } from "@/components/members/members-table";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { ListOptions } from "@/components/common/lists/list-options";
import { ListPagination } from "@/components/common/lists/list-pagination";
import { ModuleBody, ModuleHeader, ModulePage, ModulePrimaryAction } from "@/components/common/layout/module-page";
import { PERSON_SORTS, listOptionsHref, selectedSort } from "@/lib/box/list-sorting";
import { pageNumber } from "@/lib/box/pagination";
import { listBoxes, listMembersPage, listTariffs } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Socios" />
    <ModuleBody width="full">
      <LoadingState variant="table" label="Cargando socios…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const [params] = useSearchParams();
  const estado = params.get("estado") ?? undefined;
  const orden = params.get("orden") ?? undefined;
  const page = pageNumber(params.get("pagina") ?? undefined);
  const order = selectedSort(PERSON_SORTS, orden);
  const status = estado === "activos" ? "active" : estado === "baja" ? "inactive" : "all";
  const { account, query } = useAccountQuery(["members", status, order, page], async () => {
    const [result, tariffs, boxes] = await Promise.all([
      listMembersPage(status, page, order),
      listTariffs(),
      listBoxes(),
    ]);
    return { result, tariffs, boxes };
  });
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/staff/hoy">
      {({ result, tariffs, boxes }) => {
        const memberAction = <CreateMemberAltaButton tariffs={tariffs} boxes={boxes} canManageTariffs={account?.role === "admin"} />;
        const actionInToolbar = tariffs.some((tariff) => tariff.active);
        return (
          <ModulePage>
            <ModuleHeader title="Socios" description="Gestioná los socios del box, consultá sus fichas y creá nuevas altas." />
            <ModuleBody width="full" inset="content">
              {!actionInToolbar ? <ModulePrimaryAction>{memberAction}</ModulePrimaryAction> : null}
              <MembersTable
                members={result.items}
                action={actionInToolbar ? memberAction : undefined}
                filters={
                  <ListOptions
                    path="/staff/socios"
                    order={order}
                    sortOptions={PERSON_SORTS}
                    filters={[{
                      key: "estado",
                      label: "Estado del socio",
                      value: status === "all" ? "todos" : status === "inactive" ? "baja" : "activos",
                      options: [
                        { value: "todos", label: "Todos" },
                        { value: "activos", label: "Activos" },
                        { value: "baja", label: "Dados de baja" },
                      ],
                    }]}
                  />
                }
                emptyState={
                  <ListEmptyBlock
                    title={status === "all" ? "Todavía no hay socios" : "No hay socios con estos filtros"}
                    href={status === "all" ? undefined : listOptionsHref("/staff/socios", {}, order, PERSON_SORTS[0].value)}
                    action={status === "all" ? undefined : "Restablecer filtros"}
                  />
                }
              />
              <ListPagination
                pageInfo={result.pageInfo}
                path="/staff/socios"
                filters={{ estado: status === "all" ? undefined : estado, orden: order === PERSON_SORTS[0].value ? undefined : order }}
              />
            </ModuleBody>
          </ModulePage>
        );
      }}
    </QueryBody>
  );
}
