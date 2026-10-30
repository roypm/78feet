import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/current";
import { listMembers } from "@/lib/box/members";
import { listTariffs } from "@/lib/box/tariffs";
import { CreateMemberAltaButton } from "@/components/staff/member-forms";
import { FilterTabLink, FilterTabs } from "@/components/member/kind-tabs";
import { MembersTable } from "@/components/staff/members-table";
import { ModuleBody, ModuleHeader, ModulePage, ModulePrimaryAction } from "@/components/member/module-page";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Socios" />
          <ModuleBody width="full">
            <p className="text-muted-foreground">Cargando socios…</p>
          </ModuleBody>
        </ModulePage>
      }
    >
      <Members searchParams={searchParams} />
    </Suspense>
  );
}

async function Members({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await requireStaff();
  const query = await searchParams;
  const inactive = query.estado === "baja";
  const [members, tariffs] = await Promise.all([
    listMembers(inactive ? "inactive" : "active"),
    listTariffs(),
  ]);

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
            <CreateMemberAltaButton tariffs={tariffs} />
          </ModulePrimaryAction>
        ) : null}
        {members.length === 0 ? (
          <p className="text-muted-foreground">
            {inactive ? "No hay socios dados de baja." : "Todavía no hay socios."}
          </p>
        ) : (
          <MembersTable members={members} />
        )}
      </ModuleBody>
    </ModulePage>
  );
}
