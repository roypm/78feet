import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { ListOptions } from "@/components/common/lists/list-options";
import { TEAM_SORTS, selectedSort, listOptionsHref } from "@/lib/box/list-sorting";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current";
import { listStaff } from "@/lib/box/staff-users";
import { StaffForm } from "@/components/team/staff-form";
import { TeamTable } from "@/components/team/team-table";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";

type Query = { rol?: string; estado?: string; orden?: string };

export default function Page({ searchParams }: { searchParams: Promise<Query> }) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Equipo" />
          <ModuleBody width="full">
            <LoadingState variant="table" label="Cargando el equipo…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <Team searchParams={searchParams} />
    </Suspense>
  );
}

async function Team({ searchParams }: { searchParams: Promise<Query> }) {
  const currentUser = await requireAdmin();
  const query = await searchParams;
  const role = query.rol === "coach" || query.rol === "admin" ? query.rol : undefined;
  const status = query.estado === "activos" ? "active" : query.estado === "baja" ? "inactive" : undefined;
  const order = selectedSort(TEAM_SORTS, query.orden);
  const staff = await listStaff({ role, status, order });
  const filters = <ListOptions path="/staff/equipo" order={order} sortOptions={TEAM_SORTS} filters={[
    { key: "rol", label: "Rol", value: role ?? "todos", options: [
      { value: "todos", label: "Todos" }, { value: "admin", label: "Admin" }, { value: "coach", label: "Coach" },
    ] },
    { key: "estado", label: "Estado", value: status === "active" ? "activos" : status === "inactive" ? "baja" : "todos", options: [
      { value: "todos", label: "Todos" }, { value: "activos", label: "Activos" }, { value: "baja", label: "Dados de baja" },
    ] },
  ]} />;

  return (
    <ModulePage>
      <ModuleHeader
        title="Equipo"
        description="Cuentas de coach y admin con acceso al panel de staff."
      />
      <ModuleBody width="full" inset="content">
        <TeamTable staff={staff} currentUserId={currentUser.id} action={<StaffForm />} filters={filters} emptyState={<ListEmptyBlock
          title={role || status ? "No hay cuentas con estos filtros" : "Todavía no hay cuentas de equipo"}
          href={role || status ? listOptionsHref("/staff/equipo", {}, order, TEAM_SORTS[0].value) : undefined}
          action={role || status ? "Restablecer filtros" : undefined}
        />} />
      </ModuleBody>
    </ModulePage>
  );
}
