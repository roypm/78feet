
import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ListPagination } from "@/components/common/lists/list-pagination";
import { pageNumber } from "@/lib/box/pagination";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/current";
import { listUnpaidPage } from "@/lib/box/unpaid";
import { listBoxes } from "@/lib/box/boxes";
import { BoxTabs } from "@/components/boxes/box-tabs";
import { paymentBoxListHref } from "@/lib/box/payment-navigation";
import { ListSearchToolbar } from "@/components/common/lists/list-search-toolbar";
import { UnpaidMembersTable } from "@/components/payments/unpaid-members-table";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";

export default function Page({ searchParams }: { searchParams: Promise<{ pagina?: string; box?: string }> }) {
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

async function Unpaid({ searchParams }: { searchParams: Promise<{ pagina?: string; box?: string }> }) {
  await requireStaff();
  const query = await searchParams;
  const boxes = await listBoxes();
  const paymentBoxId = boxes.some((box) => box.id === query.box) ? query.box : undefined;
  const unpaid = await listUnpaidPage(undefined, pageNumber(query.pagina), paymentBoxId);
  const boxFilter = (
    <BoxTabs
      boxes={boxes}
      boxId={paymentBoxId}
      includeAll
      allHref="/staff/impagos"
      ariaLabel="Box de pago"
      hrefFor={(id) => paymentBoxListHref("/staff/impagos", id)}
    />
  );

  return (
    <ModulePage>
      <ModuleHeader
        title="Impagos"
        description="Socios con el periodo de cobro de su tarifa sin registrar pago."
      />
      <ModuleBody width="full" inset="content">
        {unpaid.items.length === 0 ? (
          <ListEmptyBlock
            filters={<ListSearchToolbar filters={boxFilter} />}
            title="No hay pagos pendientes"
            description="No hay socios con un pago periódico pendiente de registrar en su periodo en curso."
          />
        ) : (
          <UnpaidMembersTable members={unpaid.items} filters={boxFilter} />
        )}
        <ListPagination pageInfo={unpaid.pageInfo} path="/staff/impagos" filters={{ box: paymentBoxId }} />
      </ModuleBody>
    </ModulePage>
  );
}
