import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current";
import { getBoxHours } from "@/lib/box/hours";
import { HoursForm } from "@/components/staff/hours-form";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Horario del box" />
          <ModuleBody>
            <p className="text-muted-foreground">Cargando el horario…</p>
          </ModuleBody>
        </ModulePage>
      }
    >
      <Hours />
    </Suspense>
  );
}

async function Hours() {
  await requireAdmin();
  const hours = await getBoxHours();

  return (
    <ModulePage>
      <ModuleHeader title="Horario del box" />
      <ModuleBody>
        <p className="text-sm text-muted-foreground">
          Estas horas son el eje del calendario en las cuatro semanas y en las dos grillas.
        </p>
        <HoursForm openTime={hours.openTime} closeTime={hours.closeTime} />
      </ModuleBody>
    </ModulePage>
  );
}
