import { pageNumber } from "@/lib/box/pagination";
import { ListPagination } from "@/components/common/lists/list-pagination";

import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Suspense } from "react";
import { StaffCrumbs } from "@/components/common/navigation/staff-crumbs";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/current";
import { listMemberPayments } from "@/lib/box/payments";
import { BoxError } from "@/lib/box/errors";
import { memberFullName } from "@/lib/box/format";
import { MemberPaymentsTable } from "@/components/payments/member-payments-table";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ pagina?: string }> };

export default function Page({ params, searchParams }: PageProps) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Historial de pagos" />
          <ModuleBody width="full" inset="content">
            <LoadingState variant="table" label="Cargando pagos…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <MemberPayments params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function MemberPayments({ params, searchParams }: PageProps) {
  await requireStaff();
  const { id } = await params;

  let data;
  try {
    data = await listMemberPayments(id, pageNumber((await searchParams).pagina));
  } catch (error) {
    if (error instanceof BoxError && error.status === 404) notFound();
    throw error;
  }

  const memberLabel = memberFullName(data.member.firstName, data.member.lastName);
  const memberIdLine = data.member.dni ?? data.member.loginId;

  return (
    <ModulePage>
      <ModuleHeader
        title="Historial de pagos"
        description={`${memberLabel} · ${memberIdLine}. Columna «Registrado el»: cuándo el staff dio de alta el cobro.`}
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
        {data.payments.length === 0 ? (
          <ListEmptyBlock
            title="Todavía no hay pagos registrados"

            href={`/staff/socios/${id}`}
            action="Volver al socio"
          />
        ) : (
          <MemberPaymentsTable payments={data.payments} />
        )}
        <ListPagination pageInfo={data.pageInfo} path={`/staff/socios/${id}/pagos`} />
      </ModuleBody>
    </ModulePage>
  );
}
