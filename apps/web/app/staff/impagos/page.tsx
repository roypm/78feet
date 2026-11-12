import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { PERSON_SORTS, selectedSort, listOptionsHref } from "@/lib/box/list-sorting";
import { resolveFilter } from "@/lib/box/filter-url";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { ListPagination } from "@/components/common/lists/list-pagination";
import { pageNumber } from "@/lib/box/pagination";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/current";
import { listUnpaidPage } from "@/lib/box/unpaid";
import { listBoxes } from "@/lib/box/boxes";
import { ListOptions } from "@/components/common/lists/list-options";
import { UnpaidMembersTable } from "@/components/payments/unpaid-members-table";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";

export default function Page({ searchParams }: { searchParams: Promise<{ pagina?: string; box?: string; orden?: string }> }) {
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

async function Unpaid({ searchParams }: { searchParams: Promise<{ pagina?: string; box?: string; orden?: string }> }) {
  await requireStaff();
  const query = await searchParams;
  const order = selectedSort(PERSON_SORTS, query.orden);
  const boxes = await listBoxes();
  const selectedBox = resolveFilter(boxes, query.box);
  const paymentBoxId = selectedBox?.id;
  const unpaid = await listUnpaidPage(undefined, pageNumber(query.pagina), paymentBoxId, order);
  const boxFilter = (
    <ListOptions path="/staff/impagos" order={order} sortOptions={PERSON_SORTS} filters={[{
      key: "box", label: "Box de pago", value: selectedBox?.slug ?? "todos",
      options: [{ value: "todos", label: "Todos" }, ...boxes.map((box) => ({ value: box.slug, label: box.name }))],
    }]} />
  );

  return (
    <ModulePage>
      <ModuleHeader
        title="Impagos"
        description="Socios con el periodo de cobro de su tarifa sin registrar pago."
      />
      <ModuleBody width="full" inset="content">
        <UnpaidMembersTable
          members={unpaid.items}
          filters={boxFilter}
          emptyState={<ListEmptyBlock
            title={selectedBox ? "No hay pagos pendientes con estos filtros" : "No hay pagos pendientes"}
            href={selectedBox ? listOptionsHref("/staff/impagos", {}, order, PERSON_SORTS[0].value) : undefined}
            action={selectedBox ? "Restablecer filtros" : undefined}
          />}
        />
        <ListPagination pageInfo={unpaid.pageInfo} path="/staff/impagos" filters={{ box: selectedBox?.slug, orden: order === PERSON_SORTS[0].value ? undefined : order }} />
      </ModuleBody>
    </ModulePage>
  );
}
