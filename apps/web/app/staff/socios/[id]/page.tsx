import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/current";
import { getMember } from "@/lib/box/members";
import { listTariffs } from "@/lib/box/tariffs";
import { BoxError } from "@/lib/box/errors";
import { formatPrice } from "@/lib/box/format";
import { MemberActions } from "@/components/staff/member-forms";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Socio" />
          <ModuleBody>
            <p className="text-muted-foreground">Cargando el socio…</p>
          </ModuleBody>
        </ModulePage>
      }
    >
      <MemberDetail params={params} />
    </Suspense>
  );
}

async function MemberDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  let member;
  try {
    member = await getMember(id);
  } catch (error) {
    if (error instanceof BoxError && error.status === 404) notFound();
    throw error;
  }
  const tariffs = await listTariffs();

  return (
    <ModulePage>
      <ModuleHeader
        title={`${member.firstName} ${member.lastName}`}
        eyebrow={
          <Link href="/staff/socios" className="text-sm text-primary">
            Socios
          </Link>
        }
      />
      <ModuleBody>
        <dl className="flex flex-col gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
          <div>
            <dt className="text-sm text-muted-foreground">DNI</dt>
            <dd>{member.dni}</dd>
          </div>
          {member.phone ? (
            <div>
              <dt className="text-sm text-muted-foreground">Teléfono</dt>
              <dd>{member.phone}</dd>
            </div>
          ) : null}
          {member.membership ? (
            <div>
              <dt className="text-sm text-muted-foreground">Tarifa</dt>
              <dd>
                {member.membership.tariffName} · {formatPrice(member.membership.priceCents)}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-sm text-muted-foreground">Saldo de bono</dt>
            <dd>{member.credits.balance}</dd>
          </div>
        </dl>
        <MemberActions
          memberId={member.id}
          tariffs={tariffs}
          currentTariffId={member.membership?.tariffId ?? null}
          canDeactivate={user.role === "admin" && member.status === "active"}
        />
      </ModuleBody>
    </ModulePage>
  );
}
