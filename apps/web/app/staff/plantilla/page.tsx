import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/current";
import { listClassTypes } from "@/lib/box/class-types";
import { listTemplates } from "@/lib/box/templates";
import { listCoaches } from "@/lib/box/staff-users";
import { getBoxHours } from "@/lib/box/hours";
import { TemplateSchedule } from "@/components/staff/template-schedule";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Plantilla" />
          <ModuleBody>
            <p className="text-muted-foreground">Cargando la plantilla…</p>
          </ModuleBody>
        </ModulePage>
      }
    >
      <Plantilla />
    </Suspense>
  );
}

async function Plantilla() {
  const user = await requireStaff();
  const canWrite = user.role === "admin";
  const [types, templates, coaches, hours] = await Promise.all([
    listClassTypes(),
    listTemplates(),
    listCoaches(),
    getBoxHours(),
  ]);

  return (
    <ModulePage>
      <ModuleHeader title="Plantilla" />
      <ModuleBody width="full">
        <TemplateSchedule templates={templates} types={types} coaches={coaches} hours={hours} canWrite={canWrite} />
      </ModuleBody>
    </ModulePage>
  );
}
