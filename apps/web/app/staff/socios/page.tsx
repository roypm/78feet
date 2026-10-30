
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { ListPagination } from "@/components/member/list-pagination";
import { pageNumber } from "@/lib/box/pagination";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/current";
import { listMembersPage } from "@/lib/box/members";
import { listTariffs } from "@/lib/box/tariffs";
import { CreateMemberAltaButton } from "@/components/staff/member-forms";
import { FilterTabLink, FilterTabs } from "@/components/member/kind-tabs";
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
  const [result, tariffs] = await Promise.all([
    listMembersPage(inactive ? "inactive" : "active", pageNumber(query.pagina)),
    listTariffs(),
  ]);

  const members = result.items;

  return (
    <ModulePage>
      <ModuleHeader
        title="Socios"
        description={inactive ? "Socios dados de baja. Podés reactivarlos desde su perfil." : "Socios activos del box."}
        tabs={
          <FilterTabs aria-label="Estado del socio">
            <FilterTabLink href="/staff/socios" active={!inactive}>
              Activos
            </FilterTabLink>
            <FilterTabLink href="/staff/socios?estado=baja" active={inactive}>
              Dados de baja
            </FilterTabLink>
          </FilterTabs>
        }
      />
      <ModuleBody width="full" inset="content">
        {!inactive ? (
          <ModulePrimaryAction>
            <CreateMemberAltaButton tariffs={tariffs} canManageTariffs={user.role === "admin"} />
          </ModulePrimaryAction>
        ) : null}
        {members.length === 0 ? (
          <EmptyState title={inactive ? "No hay socios dados de baja" : "Todavía no hay socios"} description={inactive ? "Las cuentas dadas de baja se conservan acá para poder consultarlas o reactivarlas." : "Usá Alta de socio para crear la primera cuenta del box."} href={inactive ? "/staff/socios" : undefined} action={inactive ? "Ver socios activos" : undefined} />
        ) : (
          <MembersTable members={members} />
        )}
        <ListPagination pageInfo={result.pageInfo} path="/staff/socios" filters={{ estado: query.estado }} />
      </ModuleBody>
    </ModulePage>
  );
}
