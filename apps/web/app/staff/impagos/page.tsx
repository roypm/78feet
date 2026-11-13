import { useSearchParams } from "react-router";
import { UnpaidMembersTable } from "@/components/payments/unpaid-members-table";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { ListOptions } from "@/components/common/lists/list-options";
import { ListPagination } from "@/components/common/lists/list-pagination";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { resolveFilter } from "@/lib/box/filter-url";
import { PERSON_SORTS, listOptionsHref, selectedSort } from "@/lib/box/list-sorting";
import { pageNumber } from "@/lib/box/pagination";
import { listBoxes, listUnpaidPage } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Impagos" />
    <ModuleBody width="full">
      <LoadingState variant="table" label="Cargando impagos…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const [params] = useSearchParams();
  const boxSlug = params.get("box") ?? undefined;
  const orden = params.get("orden") ?? undefined;
  const page = pageNumber(params.get("pagina") ?? undefined);
  const order = selectedSort(PERSON_SORTS, orden);
  const { account, query } = useAccountQuery(["unpaid", boxSlug ?? "", order, page], async () => {
    const boxes = await listBoxes();
    const selectedBox = resolveFilter(boxes, boxSlug);
    const unpaid = await listUnpaidPage(undefined, page, selectedBox?.id, order);
    return { boxes, selectedBox, unpaid };
  });
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/staff/hoy">
      {({ boxes, selectedBox, unpaid }) => (
        <ModulePage>
          <ModuleHeader title="Impagos" description="Socios con el periodo de cobro de su tarifa sin registrar pago." />
          <ModuleBody width="full" inset="content">
            <UnpaidMembersTable
              members={unpaid.items}
              filters={
                <ListOptions
                  path="/staff/impagos"
                  order={order}
                  sortOptions={PERSON_SORTS}
                  filters={[{
                    key: "box",
                    label: "Box de pago",
                    value: selectedBox?.slug ?? "todos",
                    options: [{ value: "todos", label: "Todos" }, ...boxes.map((box) => ({ value: box.slug, label: box.name }))],
                  }]}
                />
              }
              emptyState={
                <ListEmptyBlock
                  title={selectedBox ? "No hay pagos pendientes con estos filtros" : "No hay pagos pendientes"}
                  href={selectedBox ? listOptionsHref("/staff/impagos", {}, order, PERSON_SORTS[0].value) : undefined}
                  action={selectedBox ? "Restablecer filtros" : undefined}
                />
              }
            />
            <ListPagination
              pageInfo={unpaid.pageInfo}
              path="/staff/impagos"
              filters={{ box: selectedBox?.slug, orden: order === PERSON_SORTS[0].value ? undefined : order }}
            />
          </ModuleBody>
        </ModulePage>
      )}
    </QueryBody>
  );
}
