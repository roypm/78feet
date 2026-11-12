import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { resolveFilter } from "@/lib/box/filter-url";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ListPagination } from "@/components/common/lists/list-pagination";
import { pageNumber } from "@/lib/box/pagination";
import { Suspense } from "react";
import { NavigationLink as Link } from "@/components/common/navigation/navigation-link";
import { requireStaff } from "@/lib/auth/current";
import { listStaffTrainingsPage, listTrainingFilterTypes } from "@/lib/box/trainings";
import { Button } from "@/components/ui/button";
import { ListOptions } from "@/components/common/lists/list-options";
import { TRAINING_SORTS, selectedSort, listOptionsHref } from "@/lib/box/list-sorting";
import { TrainingLibraryTable } from "@/components/trainings/training-library-table";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; pagina?: string; orden?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Biblioteca" description="Entrenamientos reutilizables por tipo dirigido." />
          <ModuleBody>
            <LoadingState variant="library" label="Cargando la biblioteca…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <Library searchParams={searchParams} />
    </Suspense>
  );
}

async function Library({ searchParams }: { searchParams: Promise<{ tipo?: string; pagina?: string; orden?: string }> }) {
  await requireStaff();
  const query = await searchParams;
  const order = selectedSort(TRAINING_SORTS, query.orden);
  const types = await listTrainingFilterTypes();
  const selectedType = resolveFilter(types, query.tipo);
  const classTypeId = selectedType?.id;
  const result = await listStaffTrainingsPage(classTypeId, pageNumber(query.pagina), order);

  const trainings = result.items;

  return (
    <ModulePage>
      <ModuleHeader title="Biblioteca" description="Entrenamientos reutilizables por tipo dirigido." />
      <ModuleBody width="full" inset="content">
        <TrainingLibraryTable
          trainings={trainings}
          emptyState={<ListEmptyBlock
            title={classTypeId ? "No hay entrenamientos con estos filtros" : "Todavía no hay entrenamientos"}
            href={classTypeId ? listOptionsHref("/staff/biblioteca", {}, order, TRAINING_SORTS[0].value) : undefined}
            action={classTypeId ? "Restablecer filtros" : undefined}
          />}
          filters={
            <ListOptions path="/staff/biblioteca" order={order} sortOptions={TRAINING_SORTS} filters={[{
              key: "tipo", label: "Tipo de entrenamiento", value: selectedType?.slug ?? "todos",
              options: [{ value: "todos", label: "Todos" }, ...types.map((type) => ({ value: type.slug, label: type.name }))],
            }]} />
          }
          action={
          <Button nativeButton={false} variant="outline" className="min-h-11" render={<Link href="/staff/biblioteca/nuevo" />}>
            Nuevo entrenamiento
          </Button>
        } />
        <ListPagination pageInfo={result.pageInfo} path="/staff/biblioteca" filters={{ tipo: selectedType?.slug, orden: order === TRAINING_SORTS[0].value ? undefined : order }} />
      </ModuleBody>
    </ModulePage>
  );
}
