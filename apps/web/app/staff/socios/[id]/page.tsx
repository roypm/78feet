import { useParams } from "react-router";
import { MemberProfile } from "@/components/members/member-profile";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { StaffCrumbs } from "@/components/common/navigation/staff-crumbs";
import { memberFullName } from "@/lib/box/format";
import { getMember, getMemberSummary, listBoxes, listTariffs } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Perfil de socio" />
    <ModuleBody>
      <LoadingState variant="profile" label="Cargando el socio…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const { id = "" } = useParams();
  const { account, query } = useAccountQuery(["member", id], async (account) => {
    if (account.role === "member") throw new Error("La sesión no está disponible");
    const [member, tariffs, summary, boxes] = await Promise.all([
      getMember(id),
      listTariffs(),
      getMemberSummary(id, account.role),
      listBoxes(),
    ]);
    return { member, tariffs, summary, boxes };
  });
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/staff/hoy" missing="staff">
      {({ member, tariffs, summary, boxes }) => (
        <ModulePage>
          <ModuleHeader
            title="Perfil de socio"
            description={
              <span className="flex flex-wrap items-center gap-2">
                <span>{memberFullName(member.firstName, member.lastName)} · {member.dni ?? member.loginId}</span>
                {member.status === "inactive" ? <Badge variant="outline">De baja</Badge> : null}
              </span>
            }
            eyebrow={<StaffCrumbs items={[{ href: "/staff/socios", label: "Socios" }, { label: memberFullName(member.firstName, member.lastName) }]} />}
          />
          <ModuleBody width="full" inset="content">
            <MemberProfile
              member={{
                id: member.id,
                firstName: member.firstName,
                lastName: member.lastName,
                dni: member.dni,
                phone: member.phone,
                email: member.email,
                loginId: member.loginId,
                status: member.status,
                profileImageUrl: member.profileImageUrl,
                membership: member.membership
                  ? {
                      tariffId: member.membership.tariffId,
                      tariffName: member.membership.tariffName,
                      consumptionModel: member.membership.consumptionModel,
                      billingPeriod: member.membership.billingPeriod,
                      priceCents: member.membership.priceCents,
                    }
                  : null,
                paymentBoxId: member.paymentBoxId,
                paymentBoxName: member.paymentBoxName,
              }}
              summary={summary}
              tariffs={tariffs}
              boxes={boxes}
              isAdmin={account?.role === "admin"}
            />
          </ModuleBody>
        </ModulePage>
      )}
    </QueryBody>
  );
}
