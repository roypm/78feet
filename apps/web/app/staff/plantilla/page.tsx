import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/current";
import { kindViewFromParam } from "@/lib/box/day-groups";
import { listClassTypes } from "@/lib/box/class-types";
import { listTemplates } from "@/lib/box/templates";
import { listCoaches } from "@/lib/box/staff-users";
import { getBoxHours } from "@/lib/box/hours";
import { TemplateSchedule } from "@/components/staff/template-schedule";
import { KindTabs } from "@/components/member/kind-tabs";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
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
      <Plantilla searchParams={searchParams} />
    </Suspense>
  );
}

async function Plantilla({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const user = await requireStaff();
  const query = await searchParams;
  const view = kindViewFromParam(query.tipo);
  const canWrite = user.role === "admin";
  const [types, templates, coaches, hours] = await Promise.all([
    listClassTypes(),
    listTemplates(),
    listCoaches(),
    getBoxHours(),
  ]);

  return (
    <ModulePage>
      <ModuleHeader
        title="Plantilla"
        description="Horario recurrente. Editá la grilla y aplicá cuando esté listo; rige desde el lunes siguiente."
        tabs={
          <KindTabs
            view={view}
            directedHref="/staff/plantilla"
            openHref="/staff/plantilla?tipo=open"
          />
        }
      />
      <ModuleBody width="full" fill>
        <TemplateSchedule
          view={view}
          templates={templates}
          types={types}
          coaches={coaches}
          hours={hours}
          canWrite={canWrite}
        />
      </ModuleBody>
    </ModulePage>
  );
}
