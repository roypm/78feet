import { resolveFilter } from "@/lib/box/filter-url";

import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ListPagination } from "@/components/common/lists/list-pagination";
import { pageNumber } from "@/lib/box/pagination";
import { Suspense } from "react";
import { NavigationLink as Link } from "@/components/common/navigation/navigation-link";
import { requireMember } from "@/lib/auth/current";
import { listTrainingFilterTypes, listTrainingsPage } from "@/lib/box/trainings";
import { ListOptions } from "@/components/common/lists/list-options";
import { TRAINING_SORTS, selectedSort, listOptionsHref } from "@/lib/box/list-sorting";
import { ListSearchToolbar } from "@/components/common/lists/list-search-toolbar";
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
          <ModuleHeader title="Biblioteca" description="Entrenamientos de clases dirigidas." />
          <ModuleBody width="full">
            <LoadingState variant="list" label="Cargando la biblioteca…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <Library searchParams={searchParams} />
    </Suspense>
  );
}

async function Library({ searchParams }: { searchParams: Promise<{ tipo?: string; pagina?: string; orden?: string }> }) {
  await requireMember();
  const query = await searchParams;
  const order = selectedSort(TRAINING_SORTS, query.orden);
  const types = await listTrainingFilterTypes();
  const selectedType = resolveFilter(types, query.tipo);
  const classTypeId = selectedType?.id;
  const result = await listTrainingsPage(classTypeId, pageNumber(query.pagina), order);

  const trainings = result.items;

  return (
    <ModulePage>
      <ModuleHeader title="Biblioteca" description="Entrenamientos de clases dirigidas." />
      <ModuleBody width="full">
        <ListSearchToolbar
          filters={
            <ListOptions path="/biblioteca" order={order} sortOptions={TRAINING_SORTS} filters={[{
              key: "tipo", label: "Tipo de entrenamiento", value: selectedType?.slug ?? "todos",
              options: [{ value: "todos", label: "Todos" }, ...types.map((type) => ({ value: type.slug, label: type.name }))],
            }]} />
          }
        />
        {trainings.length === 0 ? (
          <ListEmptyBlock title={classTypeId ? "No hay entrenamientos con estos filtros" : "Todavía no hay entrenamientos"}
            href={classTypeId ? listOptionsHref("/biblioteca", {}, order, TRAINING_SORTS[0].value) : undefined}
            action={classTypeId ? "Restablecer filtros" : undefined} />
        ) : (
          <ul className="flex flex-col gap-3">
            {trainings.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/biblioteca/${item.id}`}
                  className="flex flex-col gap-1 rounded-lg bg-card p-3 ring-1 ring-foreground/10"
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground">{item.classTypeName}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <ListPagination pageInfo={result.pageInfo} path="/biblioteca" filters={{ tipo: selectedType?.slug, orden: order === TRAINING_SORTS[0].value ? undefined : order }} />
      </ModuleBody>
    </ModulePage>
  );
}
