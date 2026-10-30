import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/current";
import { listUnpaid } from "@/lib/box/unpaid";
import { UnpaidMembersTable } from "@/components/staff/unpaid-members-table";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Impagos" />
          <ModuleBody width="full">
            <p className="text-muted-foreground">Cargando impagos…</p>
          </ModuleBody>
        </ModulePage>
      }
    >
      <Unpaid />
    </Suspense>
  );
}

async function Unpaid() {
  await requireStaff();
  const unpaid = await listUnpaid();

  return (
    <ModulePage>
      <ModuleHeader
        title="Impagos"
        description="Socios con el periodo de cobro de su tarifa sin registrar pago."
      />
      <ModuleBody width="full" inset="content">
        {unpaid.members.length === 0 ? (
          <p className="text-muted-foreground">Nadie con impago en el periodo en curso.</p>
        ) : (
          <UnpaidMembersTable members={unpaid.members} />
        )}
      </ModuleBody>
    </ModulePage>
  );
}
