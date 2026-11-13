import { useSearchParams } from "react-router";
import { StaffForm } from "@/components/team/staff-form";
import { TeamTable } from "@/components/team/team-table";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { ListOptions } from "@/components/common/lists/list-options";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { TEAM_SORTS, listOptionsHref, selectedSort } from "@/lib/box/list-sorting";
import { listStaff } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Equipo" />
    <ModuleBody width="full">
      <LoadingState variant="table" label="Cargando el equipo…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const [params] = useSearchParams();
  const rol = params.get("rol") ?? undefined;
  const estado = params.get("estado") ?? undefined;
  const orden = params.get("orden") ?? undefined;
  const role = rol === "coach" || rol === "admin" ? rol : undefined;
  const status = estado === "activos" ? "active" : estado === "baja" ? "inactive" : undefined;
  const order = selectedSort(TEAM_SORTS, orden);
  const { account, query } = useAccountQuery(["staff", "list", role ?? "", status ?? "", order], () =>
    listStaff({ role, status, order }),
  );
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/staff/hoy">
      {(staff) => (
        <ModulePage>
          <ModuleHeader title="Equipo" description="Cuentas de coach y admin con acceso al panel de staff." />
          <ModuleBody width="full" inset="content">
            <TeamTable
              staff={staff}
              currentUserId={account?.id ?? ""}
              action={<StaffForm />}
              filters={
                <ListOptions
                  path="/staff/equipo"
                  order={order}
                  sortOptions={TEAM_SORTS}
                  filters={[
                    {
                      key: "rol",
                      label: "Rol",
                      value: role ?? "todos",
                      options: [
                        { value: "todos", label: "Todos" },
                        { value: "admin", label: "Admin" },
                        { value: "coach", label: "Coach" },
                      ],
                    },
                    {
                      key: "estado",
                      label: "Estado",
                      value: status === "active" ? "activos" : status === "inactive" ? "baja" : "todos",
                      options: [
                        { value: "todos", label: "Todos" },
                        { value: "activos", label: "Activos" },
                        { value: "baja", label: "Dados de baja" },
                      ],
                    },
                  ]}
                />
              }
              emptyState={
                <ListEmptyBlock
                  title={role || status ? "No hay cuentas con estos filtros" : "Todavía no hay cuentas de equipo"}
                  href={role || status ? listOptionsHref("/staff/equipo", {}, order, TEAM_SORTS[0].value) : undefined}
                  action={role || status ? "Restablecer filtros" : undefined}
                />
              }
            />
          </ModuleBody>
        </ModulePage>
      )}
    </QueryBody>
  );
}
