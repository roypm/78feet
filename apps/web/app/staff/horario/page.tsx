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
      <ModuleHeader
        title="Horario del box"
        description="Apertura y cierre del eje horario en calendario, Semana y Plantilla."
      />
      <ModuleBody>
        <HoursForm openTime={hours.openTime} closeTime={hours.closeTime} />
      </ModuleBody>
    </ModulePage>
  );
}
