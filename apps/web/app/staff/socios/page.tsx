
import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ListPagination } from "@/components/common/lists/list-pagination";
import { pageNumber } from "@/lib/box/pagination";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/current";
import { listMembersPage } from "@/lib/box/members";
import { listBoxes } from "@/lib/box/boxes";
import { listTariffs } from "@/lib/box/tariffs";
import { CreateMemberAltaButton } from "@/components/members/member-forms";
import { ListOptions } from "@/components/common/lists/list-options";
import { PERSON_SORTS, selectedSort, listOptionsHref } from "@/lib/box/list-sorting";
import { MembersTable } from "@/components/members/members-table";
import { ModuleBody, ModuleHeader, ModulePage, ModulePrimaryAction } from "@/components/common/layout/module-page";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; pagina?: string; orden?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Socios" />
          <ModuleBody width="full">
            <LoadingState variant="table" label="Cargando socios…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <Members searchParams={searchParams} />
    </Suspense>
  );
}

async function Members({ searchParams }: { searchParams: Promise<{ estado?: string; pagina?: string; orden?: string }> }) {
  const user = await requireStaff();
  const query = await searchParams;
  const order = selectedSort(PERSON_SORTS, query.orden);
  const status = query.estado === "activos" ? "active" : query.estado === "baja" ? "inactive" : "all";
  const inactive = status === "inactive";
  const [result, tariffs, boxes] = await Promise.all([
    listMembersPage(status, pageNumber(query.pagina), order),
    listTariffs(),
    listBoxes(),
  ]);

  const members = result.items;
  const memberAction = <CreateMemberAltaButton tariffs={tariffs} boxes={boxes} canManageTariffs={user.role === "admin"} />;
  const actionInToolbar = tariffs.some((tariff) => tariff.active);
  const statusFilter = (
    <ListOptions path="/staff/socios" order={order} sortOptions={PERSON_SORTS} filters={[{
      key: "estado", label: "Estado del socio", value: status === "all" ? "todos" : inactive ? "baja" : "activos",
      options: [{ value: "todos", label: "Todos" }, { value: "activos", label: "Activos" }, { value: "baja", label: "Dados de baja" }],
    }]} />
  );

  return (
    <ModulePage>
      <ModuleHeader
        title="Socios"
        description="Gestioná los socios del box, consultá sus fichas y creá nuevas altas."
      />
      <ModuleBody width="full" inset="content">
        {memberAction && !actionInToolbar ? (
          <ModulePrimaryAction>
            {memberAction}
          </ModulePrimaryAction>
        ) : null}
        <MembersTable
          members={members}
          action={actionInToolbar ? memberAction : undefined}
          filters={statusFilter}
          emptyState={
            <ListEmptyBlock
              title={status === "all" ? "Todavía no hay socios" : "No hay socios con estos filtros"}
              href={status === "all" ? undefined : listOptionsHref("/staff/socios", {}, order, PERSON_SORTS[0].value)}
              action={status === "all" ? undefined : "Restablecer filtros"}
            />
          }
        />
        <ListPagination pageInfo={result.pageInfo} path="/staff/socios" filters={{ estado: status === "all" ? undefined : query.estado, orden: order === PERSON_SORTS[0].value ? undefined : order }} />
      </ModuleBody>
    </ModulePage>
  );
}
