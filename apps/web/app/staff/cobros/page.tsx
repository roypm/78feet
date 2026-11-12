import { PAYMENT_SORTS, selectedSort, listOptionsHref } from "@/lib/box/list-sorting";
import { resolveFilter } from "@/lib/box/filter-url";

import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ListPagination } from "@/components/common/lists/list-pagination";
import { pageNumber } from "@/lib/box/pagination";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/current";
import { listRegisteredPaymentsPage } from "@/lib/box/registered-payments";
import { listBoxes } from "@/lib/box/boxes";
import { formatPrice } from "@/lib/box/format";
import { ListSearchToolbar } from "@/components/common/lists/list-search-toolbar";
import { RegisteredPaymentsTable } from "@/components/payments/registered-payments-table";
import { ListOptions } from "@/components/common/lists/list-options";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";

export default function Page({ searchParams }: { searchParams: Promise<{ pagina?: string; box?: string; orden?: string }> }) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Cobros registrados" />
          <ModuleBody width="full">
            <LoadingState variant="table" label="Cargando cobros…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <Registered searchParams={searchParams} />
    </Suspense>
  );
}

async function Registered({ searchParams }: { searchParams: Promise<{ pagina?: string; box?: string; orden?: string }> }) {
  await requireStaff();
  const query = await searchParams;
  const order = selectedSort(PAYMENT_SORTS, query.orden);
  const boxes = await listBoxes();
  const selectedBox = resolveFilter(boxes, query.box);
  const paymentBoxId = selectedBox?.id;
  const data = await listRegisteredPaymentsPage(paymentBoxId, pageNumber(query.pagina), order);
  const boxLabel = paymentBoxId ? boxes.find((box) => box.id === paymentBoxId)?.name : null;
  const summary =
    data.totals.count === 0
      ? "Todavía no hay cobros registrados."
      : `${data.totals.count} cobro${data.totals.count === 1 ? "" : "s"} · ${formatPrice(data.totals.amountCents)} en total${
          boxLabel ? ` (${boxLabel})` : ""
        }`;

  return (
    <ModulePage>
      <ModuleHeader title="Cobros registrados" description={summary} />
      <ModuleBody width="full" inset="content">
        <ListSearchToolbar
          filters={
            <ListOptions path="/staff/cobros" order={order} sortOptions={PAYMENT_SORTS} filters={[{
              key: "box", label: "Box de pago", value: selectedBox?.slug ?? "todos",
              options: [{ value: "todos", label: "Todos" }, ...boxes.map((box) => ({ value: box.slug, label: box.name }))],
            }]} />
          }
        />
        {data.items.length === 0 ? (
            <ListEmptyBlock
              title={selectedBox ? "No hay cobros con estos filtros" : "Todavía no hay cobros registrados"}
              href={selectedBox ? listOptionsHref("/staff/cobros", {}, order, PAYMENT_SORTS[0].value) : undefined}
              action={selectedBox ? "Restablecer filtros" : undefined}
            />
          ) : (
            <RegisteredPaymentsTable payments={data.items} showPaymentBox={!paymentBoxId} />
          )}
          <ListPagination pageInfo={data.pageInfo} path="/staff/cobros" filters={{ box: selectedBox?.slug, orden: order === PAYMENT_SORTS[0].value ? undefined : order }} />
      </ModuleBody>
    </ModulePage>
  );
}
