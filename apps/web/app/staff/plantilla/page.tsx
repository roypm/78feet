import { LoadingState } from "@/components/feedback/loading-state";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/current";
import { kindViewFromParam } from "@/lib/box/day-groups";
import { listClassTypes } from "@/lib/box/class-types";
import { listTemplates } from "@/lib/box/templates";
import { calendarHref } from "@/lib/box/calendar-navigation";
import { listBoxes, orderBoxes, pickBox, canonicalBoxRedirect } from "@/lib/box/boxes";
import { listCoaches } from "@/lib/box/staff-users";
import { calendarAxisRange, getBoxHours } from "@/lib/box/hours";
import { TemplateSchedule } from "@/components/staff/template-schedule";
import { BoxTabs } from "@/components/member/box-tabs";
import { KindTabs } from "@/components/member/kind-tabs";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; box?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Plantilla" />
          <ModuleBody>
            <div className="px-4 py-3 md:px-6"><LoadingState variant="calendar" label="Cargando la plantilla…" /></div>
          </ModuleBody>
        </ModulePage>
      }
    >
      <Plantilla searchParams={searchParams} />
    </Suspense>
  );
}

async function Plantilla({ searchParams }: { searchParams: Promise<{ tipo?: string; box?: string }> }) {
  const user = await requireStaff();
  const query = await searchParams;
  const boxes = await listBoxes();
  const ordered = orderBoxes(boxes, user.preferenceBoxId);
  const view = kindViewFromParam(query.tipo);
  const canonical = canonicalBoxRedirect(ordered, query.box, user.preferenceBoxId, (id) =>
    calendarHref("/staff/plantilla", undefined, view, id),
  );
  if (canonical) redirect(canonical);
  const box = pickBox(ordered, query.box, user.preferenceBoxId);
  const canWrite = user.role === "admin";
  const [types, templates, coaches, hours] = await Promise.all([
    listClassTypes(),
    listTemplates(box.id),
    listCoaches(),
    getBoxHours(undefined, box.id),
  ]);

  return (
    <ModulePage>
      <ModuleHeader
        title="Plantilla"
        description="Horario recurrente. Editá la grilla y aplicá cuando esté listo; rige desde el lunes siguiente."
        tabs={
          <div className="flex flex-col items-start gap-2">
            <BoxTabs boxes={ordered} boxId={box.id} hrefFor={(id) => calendarHref("/staff/plantilla", undefined, view, id)} />
            <KindTabs
              view={view}
              directedHref={calendarHref("/staff/plantilla", undefined, "dirigidas", box.id)}
              openHref={calendarHref("/staff/plantilla", undefined, "open", box.id)}
            />
          </div>
        }
      />
      <ModuleBody width="full" fill>
        <TemplateSchedule
          view={view}
          templates={templates}
          types={types}
          coaches={coaches}
          hours={calendarAxisRange(hours)}
          openingHours={hours}
          canWrite={canWrite}
          boxId={box.id}
        />
      </ModuleBody>
    </ModulePage>
  );
}
