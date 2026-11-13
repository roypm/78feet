import { useParams } from "react-router";
import { StaffProfile } from "@/components/team/staff-profile";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { StaffCrumbs } from "@/components/common/navigation/staff-crumbs";
import { getStaff } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Perfil de equipo" />
    <ModuleBody width="full">
      <LoadingState variant="profile" label="Cargando el perfil…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const { id = "" } = useParams();
  const { account, query } = useAccountQuery(["staff", id], () => getStaff(id));
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/staff/hoy" missing="staff">
      {(person) => (
        <ModulePage>
          <ModuleHeader
            title="Perfil de equipo"
            description={`${person.firstName} ${person.lastName}`}
            eyebrow={<StaffCrumbs items={[{ href: "/staff/equipo", label: "Equipo" }, { label: `${person.firstName} ${person.lastName}` }]} />}
          />
          <ModuleBody width="full" inset="content">
            <StaffProfile person={person} />
          </ModuleBody>
        </ModulePage>
      )}
    </QueryBody>
  );
}
