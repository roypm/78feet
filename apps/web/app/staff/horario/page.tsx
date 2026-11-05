import { LoadingState } from "@/components/feedback/loading-state";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current";
import { listBoxes, pickBox } from "@/lib/box/boxes";
import { getBoxHours } from "@/lib/box/hours";
import { BoxTabs } from "@/components/member/box-tabs";
import { HoursForm } from "@/components/staff/hours-form";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";
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
  await requireAdmin();
  const query = await searchParams;
  const boxes = await listBoxes();
  const box = pickBox(boxes, query.box);
  const hours = await getBoxHours(undefined, box.id);

  return (
    <ModulePage>
      <ModuleHeader
        title="Horario del box"
        description="Define cuándo se pueden programar clases. Los cambios se aplican al guardar."
        tabs={<BoxTabs boxes={boxes} boxId={box.id} hrefFor={(id) => `/staff/horario?box=${id}`} />}
      />
      <ModuleBody width="full">
        <HoursForm key={box.id} initialConfig={hours} today={localDateString(new Date())} boxId={box.id} />
      </ModuleBody>
    </ModulePage>
  );
}
