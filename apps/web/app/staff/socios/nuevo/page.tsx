import { Suspense } from "react";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/current";
import { listTariffs } from "@/lib/box/tariffs";
import { CreateMemberForm } from "@/components/staff/member-forms";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Alta de socio" />
          <ModuleBody>
            <p className="text-muted-foreground">Cargando…</p>
          </ModuleBody>
        </ModulePage>
      }
    >
      <NewMember />
    </Suspense>
  );
}

async function NewMember() {
  await requireStaff();
  const tariffs = await listTariffs();

  return (
    <ModulePage>
      <ModuleHeader
        title="Alta de socio"
        eyebrow={
          <Link href="/staff/socios" className="text-sm text-primary">
            Socios
          </Link>
        }
      />
      <ModuleBody>
        {tariffs.filter((tariff) => tariff.active).length === 0 ? (
          <p className="text-muted-foreground">Primero el admin tiene que crear una tarifa.</p>
        ) : (
          <CreateMemberForm tariffs={tariffs} />
        )}
      </ModuleBody>
    </ModulePage>
  );
}
