import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current";
import { getBoxHours } from "@/lib/box/hours";
import { HoursForm } from "@/components/staff/hours-form";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";
import { localDateString } from "@78feet/domain";

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
        description="Define cuándo se pueden programar clases. Los cambios se aplican al guardar."
      />
      <ModuleBody width="full">
        <HoursForm initialConfig={hours} today={localDateString(new Date())} />
      </ModuleBody>
    </ModulePage>
  );
}
