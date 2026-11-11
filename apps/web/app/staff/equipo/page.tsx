import { LoadingState } from "@/components/common/feedback/loading-state";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current";
import { listStaff } from "@/lib/box/staff-users";
import { StaffForm } from "@/components/team/staff-form";
import { TeamTable } from "@/components/team/team-table";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";

export default function Page() {
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
      <Team />
    </Suspense>
  );
}

async function Team() {
  const currentUser = await requireAdmin();
  const staff = await listStaff();

  return (
    <ModulePage>
      <ModuleHeader
        title="Equipo"
        description="Cuentas de coach y admin con acceso al panel de staff."
      />
      <ModuleBody width="full" inset="content">
        <TeamTable staff={staff} currentUserId={currentUser.id} action={<StaffForm />} />
      </ModuleBody>
    </ModulePage>
  );
}
