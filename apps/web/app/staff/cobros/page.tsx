import { useSearchParams } from "react-router";
import { RegisteredPaymentsTable } from "@/components/payments/registered-payments-table";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { ListOptions } from "@/components/common/lists/list-options";
import { ListPagination } from "@/components/common/lists/list-pagination";
import { ListSearchToolbar } from "@/components/common/lists/list-search-toolbar";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { resolveFilter } from "@/lib/box/filter-url";
import { formatPrice } from "@/lib/box/format";
import { PAYMENT_SORTS, listOptionsHref, selectedSort } from "@/lib/box/list-sorting";
import { pageNumber } from "@/lib/box/pagination";
import { listBoxes, listRegisteredPaymentsPage } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Cobros registrados" />
    <ModuleBody width="full">
      <LoadingState variant="table" label="Cargando cobros…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const [params] = useSearchParams();
  const boxSlug = params.get("box") ?? undefined;
  const orden = params.get("orden") ?? undefined;
  const page = pageNumber(params.get("pagina") ?? undefined);
  const order = selectedSort(PAYMENT_SORTS, orden);
  const { account, query } = useAccountQuery(["payments", "registered", boxSlug ?? "", order, page], async () => {
    const boxes = await listBoxes();
    const selectedBox = resolveFilter(boxes, boxSlug);
    const data = await listRegisteredPaymentsPage(selectedBox?.id, page, order);
    return { boxes, selectedBox, data };
  });
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/staff/hoy">
      {({ boxes, selectedBox, data }) => {
        const boxLabel = selectedBox ? boxes.find((box) => box.id === selectedBox.id)?.name : null;
        const summary = data.totals.count === 0
          ? "Todavía no hay cobros registrados."
          : `${data.totals.count} cobro${data.totals.count === 1 ? "" : "s"} · ${formatPrice(data.totals.amountCents)} en total${boxLabel ? ` (${boxLabel})` : ""}`;
        return (
          <ModulePage>
            <ModuleHeader title="Cobros registrados" description={summary} />
            <ModuleBody width="full" inset="content">
              <ListSearchToolbar
                filters={
                  <ListOptions
                    path="/staff/cobros"
                    order={order}
                    sortOptions={PAYMENT_SORTS}
                    filters={[{
                      key: "box",
                      label: "Box de pago",
                      value: selectedBox?.slug ?? "todos",
                      options: [{ value: "todos", label: "Todos" }, ...boxes.map((box) => ({ value: box.slug, label: box.name }))],
                    }]}
                  />
                }
              />
              {data.items.length === 0 ? (
                <ListEmptyBlock
                  title={selectedBox ? "No hay cobros con estos filtros" : "Todavía no hay cobros registrados"}
                  href={selectedBox ? listOptionsHref("/staff/cobros", {}, order, PAYMENT_SORTS[0].value) : undefined}
                  action={selectedBox ? "Restablecer filtros" : undefined}
                />
              ) : (
                <RegisteredPaymentsTable payments={data.items} showPaymentBox={!selectedBox} />
              )}
              <ListPagination
                pageInfo={data.pageInfo}
                path="/staff/cobros"
                filters={{ box: selectedBox?.slug, orden: order === PAYMENT_SORTS[0].value ? undefined : order }}
              />
            </ModuleBody>
          </ModulePage>
        );
      }}
    </QueryBody>
  );
}
