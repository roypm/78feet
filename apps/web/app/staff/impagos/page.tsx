
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { ListPagination } from "@/components/member/list-pagination";
import { pageNumber } from "@/lib/box/pagination";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/current";
import { listUnpaidPage } from "@/lib/box/unpaid";
import { UnpaidMembersTable } from "@/components/staff/unpaid-members-table";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Impagos" />
          <ModuleBody width="full">
            <LoadingState variant="table" label="Cargando impagos…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <Unpaid searchParams={searchParams} />
    </Suspense>
  );
}

async function Unpaid({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  await requireStaff();
  const query = await searchParams;
  const unpaid = await listUnpaidPage(undefined, pageNumber(query.pagina));

  return (
    <ModulePage>
      <ModuleHeader
        title="Impagos"
        description="Socios con el periodo de cobro de su tarifa sin registrar pago."
      />
      <ModuleBody width="full" inset="content">
        {unpaid.items.length === 0 ? (
          <EmptyState title="No hay pagos pendientes" description="No hay socios con un pago periódico pendiente de registrar en su periodo en curso." />
        ) : (
          <UnpaidMembersTable members={unpaid.items} />
        )}
        <ListPagination pageInfo={unpaid.pageInfo} path="/staff/impagos" />
      </ModuleBody>
    </ModulePage>
  );
}
