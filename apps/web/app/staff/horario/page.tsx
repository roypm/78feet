import { useSearchParams } from "react-router";
import { localDateString } from "@78feet/domain";
import { HoursForm } from "@/components/boxes/hours/hours-form";
import { BoxTabs } from "@/components/boxes/box-tabs";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { orderBoxes, pickBox } from "@/lib/box/boxes";
import { resolveFilter } from "@/lib/box/filter-url";
import { getBoxHours, listBoxes } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";
import { useAccount } from "@/lib/spa/session";

const pending = (
  <ModulePage>
    <ModuleHeader title="Horario del box" />
    <ModuleBody>
      <LoadingState variant="form" label="Cargando el horario…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const [params] = useSearchParams();
  const boxSlug = params.get("box") ?? undefined;
  const preferenceId = useAccount()?.preferenceBoxId ?? "";
  const { account, query } = useAccountQuery(["hours", preferenceId, boxSlug ?? ""], async (account) => {
    const boxes = orderBoxes(await listBoxes(), account.preferenceBoxId);
    const box = pickBox(boxes, resolveFilter(boxes, boxSlug)?.id, account.preferenceBoxId);
    return { boxes, box, hours: await getBoxHours(box.id) };
  });
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/staff/hoy">
      {({ boxes, box, hours }) => (
        <ModulePage>
          <ModuleHeader
            title="Horario del box"
            description="Define cuándo se pueden programar clases. Los cambios se aplican al guardar."
            tabs={boxes.length > 1 ? <BoxTabs boxes={boxes} boxId={box.id} hrefFor={(id) => `/staff/horario?box=${id}`} /> : undefined}
          />
          <ModuleBody width="full">
            <HoursForm key={box.id} initialConfig={hours} today={localDateString(new Date())} boxId={box.id} />
          </ModuleBody>
        </ModulePage>
      )}
    </QueryBody>
  );
}
