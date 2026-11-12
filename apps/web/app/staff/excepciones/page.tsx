
import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ListPagination } from "@/components/common/lists/list-pagination";
import { pageNumber } from "@/lib/box/pagination";
import { Suspense } from "react";
import { addDays, localDateString } from "@78feet/domain";
import { requireStaff } from "@/lib/auth/current";
import { listExceptionsPage } from "@/lib/box/exceptions";
import { listBoxes } from "@/lib/box/boxes";
import { listClassTypes } from "@/lib/box/class-types";
import { listCoaches } from "@/lib/box/staff-users";
import { ExtraClassForm } from "@/components/classes/extra-class-form";
import { ExceptionsList } from "@/components/classes/exceptions-list";
import { ModuleBody, ModuleHeader, ModulePage, ModulePrimaryAction } from "@/components/common/layout/module-page";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Excepciones" />
          <ModuleBody width="full">
            <LoadingState variant="list" label="Cargando excepciones…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <Exceptions searchParams={searchParams} />
    </Suspense>
  );
}

async function Exceptions({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const user = await requireStaff();
  const query = await searchParams;
  const today = localDateString(new Date());
  const [result, classTypes, coaches, boxes] = await Promise.all([
    listExceptionsPage(today, pageNumber(query.pagina)),
    listClassTypes(),
    listCoaches(),
    listBoxes(),
  ]);
  const items = result.items;

  return (
    <ModulePage>
      <ModuleHeader
        title="Excepciones"
        description="Solo lo que no sigue la plantilla al pie de la letra: clases extra, instancias modificadas o canceladas. Podés añadir una extra en cualquier fecha futura, también más allá del calendario visible en Semana."
      />
      <ModuleBody width="full" inset="content">
        {classTypes.length === 0 ? (
          <ListEmptyBlock
            title="Primero hace falta un tipo de clase"
            description={user.role === "admin" ? "Creá un tipo antes de añadir clases extra." : "Pedile al admin que cree un tipo de clase para poder añadir sesiones."}
            href={user.role === "admin" ? "/staff/tipos" : undefined}
            action="Crear tipo"
          />
        ) : (
          <>
            <ModulePrimaryAction>
              <ExtraClassForm defaultDate={addDays(today, 1)} classTypes={classTypes} coaches={coaches} boxes={boxes} />
            </ModulePrimaryAction>
            <div className="flex flex-col gap-3">
              <ExceptionsList items={items} />
              <ListPagination pageInfo={result.pageInfo} path="/staff/excepciones" />
            </div>
          </>
        )}
      </ModuleBody>
    </ModulePage>
  );
}
