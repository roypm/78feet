
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Suspense } from "react";
import { NavigationLink as Link } from "@/components/feedback/navigation-link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/current";
import { listMemberPayments } from "@/lib/box/payments";
import { BoxError } from "@/lib/box/errors";
import { memberFullName } from "@/lib/box/format";
import { MemberPaymentsTable } from "@/components/staff/member-payments-table";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
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
      <MemberPayments params={params} />
    </Suspense>
  );
}

async function MemberPayments({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  let data;
  try {
    data = await listMemberPayments(id);
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
        description={`${memberLabel} · ${memberIdLine}`}
        eyebrow={
          <Link href={`/staff/socios/${data.member.id}`} className="text-sm text-primary">
            Perfil de socio
          </Link>
        }
      />
      <ModuleBody width="full" inset="content">
        {data.payments.length === 0 ? (
          <EmptyState title="Todavía no hay pagos registrados" description="Los pagos que registre el staff aparecerán en este historial." href={`/staff/socios/${id}`} action="Volver al socio" />
        ) : (
          <MemberPaymentsTable payments={data.payments} />
        )}
      </ModuleBody>
    </ModulePage>
  );
}
