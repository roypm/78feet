import { resolveFilter } from "@/lib/box/filter-url";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/current";
import { kindViewFromParam } from "@/lib/box/day-groups";
import { listClassTypes } from "@/lib/box/class-types";
import { listTemplates } from "@/lib/box/templates";
import { calendarHref } from "@/lib/box/calendar-navigation";
import { listBoxes, orderBoxes, pickBox } from "@/lib/box/boxes";
import { listCoaches } from "@/lib/box/staff-users";
import { calendarAxisRange, getBoxHours } from "@/lib/box/hours";
import { TemplateSchedule } from "@/components/boxes/template-schedule/template-schedule";
import { BoxTabs } from "@/components/boxes/box-tabs";
import { KindTabs } from "@/components/common/filters/kind-tabs";
import { ModuleBody, ModuleHeader, ModulePage, ModuleHeaderTabStack } from "@/components/common/layout/module-page";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ grilla?: string; box?: string }>;
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

async function Plantilla({ searchParams }: { searchParams: Promise<{ grilla?: string; box?: string }> }) {
  const user = await requireStaff();
  const query = await searchParams;
  const boxes = await listBoxes();
  const ordered = orderBoxes(boxes, user.preferenceBoxId);
  const view = kindViewFromParam(query.grilla);
  const box = pickBox(ordered, resolveFilter(ordered, query.box)?.id, user.preferenceBoxId);
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
          <ModuleHeaderTabStack>
            <BoxTabs boxes={ordered} boxId={box.id} hrefFor={(id) => calendarHref("/staff/plantilla", undefined, view, id)} />
            <KindTabs
              view={view}
              directedHref={calendarHref("/staff/plantilla", undefined, "dirigidas", box.slug)}
              openHref={calendarHref("/staff/plantilla", undefined, "open", box.slug)}
            />
          </ModuleHeaderTabStack>
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
