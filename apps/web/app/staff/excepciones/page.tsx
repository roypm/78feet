import { useSearchParams } from "react-router";
import { addDays, localDateString } from "@78feet/domain";
import { ExtraClassForm } from "@/components/classes/extra-class-form";
import { ExceptionsList } from "@/components/classes/exceptions-list";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { ListPagination } from "@/components/common/lists/list-pagination";
import { ModuleBody, ModuleHeader, ModulePage, ModulePrimaryAction } from "@/components/common/layout/module-page";
import { pageNumber } from "@/lib/box/pagination";
import { listBoxes, listClassTypes, listCoaches, listExceptionsPage } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Excepciones" />
    <ModuleBody width="full">
      <LoadingState variant="list" label="Cargando excepciones…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const [params] = useSearchParams();
  const page = pageNumber(params.get("pagina") ?? undefined);
  const { account, query } = useAccountQuery(["exceptions", page], async () => {
    const today = localDateString(new Date());
    const [result, classTypes, coaches, boxes] = await Promise.all([
      listExceptionsPage(today, page),
      listClassTypes(),
      listCoaches(),
      listBoxes(),
    ]);
    return { today, result, classTypes, coaches, boxes };
  });
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/staff/hoy">
      {({ today, result, classTypes, coaches, boxes }) => (
        <ModulePage>
          <ModuleHeader title="Excepciones" description="Solo lo que no sigue la plantilla al pie de la letra: clases extra, instancias modificadas o canceladas. Podés añadir una extra en cualquier fecha futura, también más allá del calendario visible en Semana." />
          <ModuleBody width="full" inset="content">
            {classTypes.length === 0 ? (
              <ListEmptyBlock
                title="Primero hace falta un tipo de clase"
                description={account?.role === "admin" ? "Creá un tipo antes de añadir clases extra." : "Pedile al admin que cree un tipo de clase para poder añadir sesiones."}
                href={account?.role === "admin" ? "/staff/tipos" : undefined}
                action="Crear tipo"
              />
            ) : (
              <>
                <ModulePrimaryAction>
                  <ExtraClassForm defaultDate={addDays(today, 1)} classTypes={classTypes} coaches={coaches} boxes={boxes} />
                </ModulePrimaryAction>
                <div className="flex flex-col gap-3">
                  <ExceptionsList items={result.items} />
                  <ListPagination pageInfo={result.pageInfo} path="/staff/excepciones" />
                </div>
              </>
            )}
          </ModuleBody>
        </ModulePage>
      )}
    </QueryBody>
  );
}
