
import { ListEmptyBlock } from "@/components/staff/list-empty-block";
import { LoadingState } from "@/components/feedback/loading-state";
import { ListPagination } from "@/components/member/list-pagination";
import { pageNumber } from "@/lib/box/pagination";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/current";
import { listMembersPage } from "@/lib/box/members";
import { listBoxes } from "@/lib/box/boxes";
import { listTariffs } from "@/lib/box/tariffs";
import { CreateMemberAltaButton } from "@/components/staff/member-forms";
import { FilterTabLink, FilterTabs } from "@/components/member/kind-tabs";
import { ListSearchToolbar } from "@/components/staff/list-search-toolbar";
import { MembersTable } from "@/components/staff/members-table";
import { ModuleBody, ModuleHeader, ModulePage, ModulePrimaryAction } from "@/components/member/module-page";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; pagina?: string }>;
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

async function Members({ searchParams }: { searchParams: Promise<{ estado?: string; pagina?: string }> }) {
  const user = await requireStaff();
  const query = await searchParams;
  const inactive = query.estado === "baja";
  const [result, tariffs, boxes] = await Promise.all([
    listMembersPage(inactive ? "inactive" : "active", pageNumber(query.pagina)),
    listTariffs(),
    listBoxes(),
  ]);

  const members = result.items;
  const memberAction = !inactive ? <CreateMemberAltaButton tariffs={tariffs} boxes={boxes} canManageTariffs={user.role === "admin"} /> : null;
  const actionInToolbar = !inactive && members.length > 0 && tariffs.some((tariff) => tariff.active);
  const statusFilter = (
    <FilterTabs aria-label="Estado del socio" className="max-w-none shrink-0">
      <FilterTabLink href="/staff/socios" active={!inactive}>
        Activos
      </FilterTabLink>
      <FilterTabLink href="/staff/socios?estado=baja" active={inactive}>
        Dados de baja
      </FilterTabLink>
    </FilterTabs>
  );

  return (
    <ModulePage>
      <ModuleHeader
        title="Socios"
        description={inactive ? "Socios dados de baja. Podés reactivarlos desde su perfil." : "Socios activos del box."}
      />
      <ModuleBody width="full" inset="content">
        {memberAction && !actionInToolbar ? (
          <ModulePrimaryAction>
            {memberAction}
          </ModulePrimaryAction>
        ) : null}
        {members.length === 0 ? (
          <ListEmptyBlock
            filters={<ListSearchToolbar filters={statusFilter} />}
            title={inactive ? "No hay socios dados de baja" : "Todavía no hay socios"}
            description={
              inactive
                ? "Las cuentas dadas de baja se conservan acá para poder consultarlas o reactivarlas."
                : "Usá Alta de socio para crear la primera cuenta del box."
            }
            href={inactive ? "/staff/socios" : undefined}
            action={inactive ? "Ver socios activos" : undefined}
          />
        ) : (
          <MembersTable members={members} action={actionInToolbar ? memberAction : undefined} filters={statusFilter} />
        )}
        <ListPagination pageInfo={result.pageInfo} path="/staff/socios" filters={{ estado: query.estado }} />
      </ModuleBody>
    </ModulePage>
  );
}
