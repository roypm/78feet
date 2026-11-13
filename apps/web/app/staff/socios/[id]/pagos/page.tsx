import { useParams, useSearchParams } from "react-router";
import { MemberPaymentsTable } from "@/components/payments/member-payments-table";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { ListPagination } from "@/components/common/lists/list-pagination";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { StaffCrumbs } from "@/components/common/navigation/staff-crumbs";
import { memberFullName } from "@/lib/box/format";
import { pageNumber } from "@/lib/box/pagination";
import { listMemberPayments } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Historial de pagos" />
    <ModuleBody width="full" inset="content">
      <LoadingState variant="table" label="Cargando pagos…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const page = pageNumber(params.get("pagina") ?? undefined);
  const { account, query } = useAccountQuery(["payments", "member", id, page], () => listMemberPayments(id, page));
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/staff/hoy" missing="staff">
      {(data) => {
        const memberLabel = memberFullName(data.member.firstName, data.member.lastName);
        return (
          <ModulePage>
            <ModuleHeader
              title="Historial de pagos"
              description={`${memberLabel} · ${data.member.dni ?? data.member.loginId}. Columna «Registrado el»: cuándo el staff dio de alta el cobro.`}
              eyebrow={
                <StaffCrumbs
                  items={[
                    { href: "/staff/socios", label: "Socios" },
                    { href: `/staff/socios/${data.member.id}`, label: memberLabel },
                    { label: "Pagos" },
                  ]}
                />
              }
            />
            <ModuleBody width="full" inset="content">
              {data.items.length === 0 ? (
                <ListEmptyBlock title="Todavía no hay pagos registrados" href={`/staff/socios/${id}`} action="Volver al socio" />
              ) : (
                <MemberPaymentsTable payments={data.items} />
              )}
              <ListPagination pageInfo={data.pageInfo} path={`/staff/socios/${id}/pagos`} />
            </ModuleBody>
          </ModulePage>
        );
      }}
    </QueryBody>
  );
}
