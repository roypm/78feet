import { LoadingState } from "@/components/feedback/loading-state";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current";
import { listStaff } from "@/lib/box/staff-users";
import { StaffForm } from "@/components/staff/staff-form";
import { TeamTable } from "@/components/staff/team-table";
import { ModuleBody, ModuleHeader, ModulePage, ModulePrimaryAction } from "@/components/member/module-page";

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
        <ModulePrimaryAction>
          <StaffForm />
        </ModulePrimaryAction>
        <TeamTable staff={staff} currentUserId={currentUser.id} />
      </ModuleBody>
    </ModulePage>
  );
}
