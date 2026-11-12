import { resolveFilter } from "@/lib/box/filter-url";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current";
import { listBoxes, orderBoxes, pickBox } from "@/lib/box/boxes";
import { getBoxHours } from "@/lib/box/hours";
import { BoxTabs } from "@/components/boxes/box-tabs";
import { HoursForm } from "@/components/boxes/hours/hours-form";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { localDateString } from "@78feet/domain";

export default function Page({ searchParams }: { searchParams: Promise<{ box?: string }> }) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Horario del box" />
          <ModuleBody>
            <LoadingState variant="form" label="Cargando el horario…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <Hours searchParams={searchParams} />
    </Suspense>
  );
}

async function Hours({ searchParams }: { searchParams: Promise<{ box?: string }> }) {
  const user = await requireAdmin();
  const query = await searchParams;
  const boxes = orderBoxes(await listBoxes(), user.preferenceBoxId);
  const box = pickBox(boxes, resolveFilter(boxes, query.box)?.id, user.preferenceBoxId);
  const hours = await getBoxHours(undefined, box.id);

  return (
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
  );
}
