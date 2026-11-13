import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { ListOptions } from "@/components/common/lists/list-options";
import { ListPagination } from "@/components/common/lists/list-pagination";
import { NavigationLink as Link } from "@/components/common/navigation/navigation-link";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { TrainingLibraryTable } from "@/components/trainings/training-library-table";
import { resolveFilter } from "@/lib/box/filter-url";
import { TRAINING_SORTS, listOptionsHref, selectedSort } from "@/lib/box/list-sorting";
import { pageNumber } from "@/lib/box/pagination";
import { listStaffTrainingsPage, listTrainingFilterTypes } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Biblioteca" description="Entrenamientos reutilizables por tipo dirigido." />
    <ModuleBody>
      <LoadingState variant="library" label="Cargando la biblioteca…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const [params] = useSearchParams();
  const tipo = params.get("tipo") ?? undefined;
  const orden = params.get("orden") ?? undefined;
  const page = pageNumber(params.get("pagina") ?? undefined);
  const order = selectedSort(TRAINING_SORTS, orden);
  const { account, query } = useAccountQuery(["trainings", "staff", tipo ?? "", order, page], async () => {
    const types = await listTrainingFilterTypes();
    const selectedType = resolveFilter(types, tipo);
    const result = await listStaffTrainingsPage(selectedType?.id, page, order);
    return { types, selectedType, result };
  });
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/staff/hoy">
      {({ types, selectedType, result }) => (
        <ModulePage>
          <ModuleHeader title="Biblioteca" description="Entrenamientos reutilizables por tipo dirigido." />
          <ModuleBody width="full" inset="content">
            <TrainingLibraryTable
              trainings={result.items}
              emptyState={
                <ListEmptyBlock
                  title={selectedType ? "No hay entrenamientos con estos filtros" : "Todavía no hay entrenamientos"}
                  href={selectedType ? listOptionsHref("/staff/biblioteca", {}, order, TRAINING_SORTS[0].value) : undefined}
                  action={selectedType ? "Restablecer filtros" : undefined}
                />
              }
              filters={
                <ListOptions
                  path="/staff/biblioteca"
                  order={order}
                  sortOptions={TRAINING_SORTS}
                  filters={[{
                    key: "tipo",
                    label: "Tipo de entrenamiento",
                    value: selectedType?.slug ?? "todos",
                    options: [{ value: "todos", label: "Todos" }, ...types.map((type) => ({ value: type.slug, label: type.name }))],
                  }]}
                />
              }
              action={
                <Button nativeButton={false} variant="outline" className="min-h-11" render={<Link href="/staff/biblioteca/nuevo" />}>
                  Nuevo entrenamiento
                </Button>
              }
            />
            <ListPagination
              pageInfo={result.pageInfo}
              path="/staff/biblioteca"
              filters={{ tipo: selectedType?.slug, orden: order === TRAINING_SORTS[0].value ? undefined : order }}
            />
          </ModuleBody>
        </ModulePage>
      )}
    </QueryBody>
  );
}
