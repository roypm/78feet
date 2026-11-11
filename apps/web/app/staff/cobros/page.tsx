
import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ListPagination } from "@/components/common/lists/list-pagination";
import { pageNumber } from "@/lib/box/pagination";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/current";
import { listRegisteredPaymentsPage } from "@/lib/box/registered-payments";
import { listBoxes } from "@/lib/box/boxes";
import { formatPrice } from "@/lib/box/format";
import { paymentBoxListHref } from "@/lib/box/payment-navigation";
import { ListSearchToolbar } from "@/components/common/lists/list-search-toolbar";
import { RegisteredPaymentsTable } from "@/components/payments/registered-payments-table";
import { BoxTabs } from "@/components/boxes/box-tabs";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";

export default function Page({ searchParams }: { searchParams: Promise<{ pagina?: string; box?: string }> }) {
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

async function Registered({ searchParams }: { searchParams: Promise<{ pagina?: string; box?: string }> }) {
  await requireStaff();
  const query = await searchParams;
  const boxes = await listBoxes();
  const paymentBoxId = boxes.some((box) => box.id === query.box) ? query.box : undefined;
  const data = await listRegisteredPaymentsPage(paymentBoxId, pageNumber(query.pagina));
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
            <BoxTabs
              boxes={boxes}
              boxId={paymentBoxId}
              includeAll
              allHref="/staff/cobros"
              ariaLabel="Box de pago"
              hrefFor={(id) => paymentBoxListHref("/staff/cobros", id)}
            />
          }
        />
        {data.items.length === 0 ? (
            <ListEmptyBlock
              title="No hay cobros registrados"
              description={
                paymentBoxId
                  ? "En este box de pago todavía no hay pagos dados de alta en el sistema."
                  : "Cuando el staff registre un pago, aparecerá aquí con la fecha de alta y el box de pago del socio en ese momento."
              }
              href="/staff/impagos"
              action="Ver impagos"
            />
          ) : (
            <RegisteredPaymentsTable payments={data.items} showPaymentBox={!paymentBoxId} />
          )}
          <ListPagination pageInfo={data.pageInfo} path="/staff/cobros" filters={{ box: paymentBoxId }} />
      </ModuleBody>
    </ModulePage>
  );
}
