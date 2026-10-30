import { LoadingState } from "@/components/feedback/loading-state";
import { Suspense } from "react";
import { NavigationLink as Link } from "@/components/feedback/navigation-link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/current";
import { getMember } from "@/lib/box/members";
import { listTariffs } from "@/lib/box/tariffs";
import { BoxError } from "@/lib/box/errors";
import { memberFullName } from "@/lib/box/format";
import { getMemberSummary } from "@/lib/box/summary";
import { MemberProfile } from "@/components/staff/member-profile";
import { Badge } from "@/components/ui/badge";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Perfil de socio" />
          <ModuleBody>
            <LoadingState variant="profile" label="Cargando el socio…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <MemberDetail params={params} />
    </Suspense>
  );
}

async function MemberDetail({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;
  const [member, tariffs, summary] = await Promise.all([
    (async () => {
      try {
        return await getMember(id);
      } catch (error) {
        if (error instanceof BoxError && error.status === 404) notFound();
        throw error;
      }
    })(),
    listTariffs(),
    getMemberSummary(id),
  ]);

  const profileMember = {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    dni: member.dni,
    phone: member.phone,
    email: member.email,
    loginId: member.loginId,
    status: member.status,
    membership: member.membership
      ? {
          tariffId: member.membership.tariffId,
          tariffName: member.membership.tariffName,
          consumptionModel: member.membership.consumptionModel,
          billingPeriod: member.membership.billingPeriod,
          priceCents: member.membership.priceCents,
        }
      : null,
  };

  return (
    <ModulePage>
      <ModuleHeader
        title="Perfil de socio"
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>
              {memberFullName(member.firstName, member.lastName)} · {member.dni ?? member.loginId}
            </span>
            {member.status === "inactive" ? <Badge variant="outline">De baja</Badge> : null}
          </span>
        }
        eyebrow={
          <Link href="/staff/socios" className="text-sm text-primary">
            Socios
          </Link>
        }
      />
      <ModuleBody width="full" inset="content">
        <MemberProfile
          member={profileMember}
          summary={summary}
          tariffs={tariffs}
          isAdmin={staff.role === "admin"}
        />
      </ModuleBody>
    </ModulePage>
  );
}
