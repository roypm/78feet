import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/current";
import { listClassTypes } from "@/lib/box/class-types";
import { listTemplates } from "@/lib/box/templates";
import { listCoaches } from "@/lib/box/staff-users";
import { ClassTypesPanel, TemplatesPanel } from "@/components/staff/plantilla-panel";
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
  const [types, templates, coaches] = await Promise.all([listClassTypes(), listTemplates(), listCoaches()]);

  return (
    <ModulePage>
      <ModuleHeader title="Plantilla" />
      <ModuleBody>
        <ClassTypesPanel types={types} canWrite={canWrite} />
        <TemplatesPanel templates={templates} types={types} coaches={coaches} canWrite={canWrite} />
      </ModuleBody>
    </ModulePage>
  );
}
