import { useSearchParams } from "react-router";
import { TemplateSchedule } from "@/components/boxes/template-schedule/template-schedule";
import { BoxTabs } from "@/components/boxes/box-tabs";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { KindTabs } from "@/components/common/filters/kind-tabs";
import { ModuleBody, ModuleHeader, ModuleHeaderTabStack, ModulePage } from "@/components/common/layout/module-page";
import { orderBoxes, pickBox } from "@/lib/box/boxes";
import { calendarHref } from "@/lib/box/calendar-navigation";
import { kindViewFromParam } from "@/lib/box/day-groups";
import { resolveFilter } from "@/lib/box/filter-url";
import { calendarAxisRange } from "@/lib/box/hours";
import { getBoxHours, listBoxes, listClassTypes, listCoaches, listTemplates } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";
import { useAccount } from "@/lib/spa/session";

const pending = (
  <ModulePage>
    <ModuleHeader title="Plantilla" />
    <ModuleBody>
      <div className="px-4 py-3 md:px-6">
        <LoadingState variant="calendar" label="Cargando la plantilla…" />
      </div>
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const [params] = useSearchParams();
  const grilla = params.get("grilla") ?? undefined;
  const boxSlug = params.get("box") ?? undefined;
  const preferenceId = useAccount()?.preferenceBoxId ?? "";
  const { account, query } = useAccountQuery(["templates", preferenceId, boxSlug ?? "", grilla ?? ""], async (account) => {
    const ordered = orderBoxes(await listBoxes(), account.preferenceBoxId);
    const view = kindViewFromParam(grilla);
    const box = pickBox(ordered, resolveFilter(ordered, boxSlug)?.id, account.preferenceBoxId);
    const [types, templates, coaches, hours] = await Promise.all([
      listClassTypes(),
      listTemplates(box.id),
      listCoaches(),
      getBoxHours(box.id),
    ]);
    return { ordered, view, box, types, templates, coaches, hours, canWrite: account.role === "admin" };
  });
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/staff/hoy">
      {({ ordered, view, box, types, templates, coaches, hours, canWrite }) => (
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
            <TemplateSchedule view={view} templates={templates} types={types} coaches={coaches} hours={calendarAxisRange(hours)} openingHours={hours} canWrite={canWrite} boxId={box.id} />
          </ModuleBody>
        </ModulePage>
      )}
    </QueryBody>
  );
}
