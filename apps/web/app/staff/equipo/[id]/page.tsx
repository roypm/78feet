import { LoadingState } from "@/components/feedback/loading-state";
import { Suspense } from "react";
import { NavigationLink as Link } from "@/components/feedback/navigation-link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/current";
import { getStaff } from "@/lib/box/staff-users";
import { BoxError } from "@/lib/box/errors";
import { StaffProfile } from "@/components/staff/staff-profile";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Perfil de equipo" />
          <ModuleBody width="full">
            <LoadingState variant="profile" label="Cargando el perfil…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <StaffDetail params={params} />
    </Suspense>
  );
}

async function StaffDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  let person;
  try {
    person = await getStaff(id);
  } catch (error) {
    if (error instanceof BoxError && error.status === 404) notFound();
    throw error;
  }

  return (
    <ModulePage>
      <ModuleHeader
        title="Perfil de equipo"
        description={`${person.firstName} ${person.lastName}`}
        eyebrow={
          <Link href="/staff/equipo" className="text-sm text-primary">
            Equipo
          </Link>
        }
      />
      <ModuleBody width="full" inset="content">
        <StaffProfile person={person} />
      </ModuleBody>
    </ModulePage>
  );
}
