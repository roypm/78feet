import { useSearchParams } from "react-router";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { ListOptions } from "@/components/common/lists/list-options";
import { ListPagination } from "@/components/common/lists/list-pagination";
import { ListSearchToolbar } from "@/components/common/lists/list-search-toolbar";
import { NavigationLink as Link } from "@/components/common/navigation/navigation-link";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { resolveFilter } from "@/lib/box/filter-url";
import { TRAINING_SORTS, listOptionsHref, selectedSort } from "@/lib/box/list-sorting";
import { pageNumber } from "@/lib/box/pagination";
import { listTrainingFilterTypes, listTrainingsPage } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Biblioteca" description="Entrenamientos de clases dirigidas." />
    <ModuleBody width="full">
      <LoadingState variant="list" label="Cargando la biblioteca…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const [params] = useSearchParams();
  const tipo = params.get("tipo") ?? undefined;
  const orden = params.get("orden") ?? undefined;
  const page = pageNumber(params.get("pagina") ?? undefined);
  const order = selectedSort(TRAINING_SORTS, orden);
  const { account, query } = useAccountQuery(["trainings", "member", tipo ?? "", order, page], async () => {
    const types = await listTrainingFilterTypes();
    const selectedType = resolveFilter(types, tipo);
    const result = await listTrainingsPage(selectedType?.id, page, order);
    return { types, selectedType, result };
  });
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/calendario">
      {({ types, selectedType, result }) => (
        <ModulePage>
          <ModuleHeader title="Biblioteca" description="Entrenamientos de clases dirigidas." />
          <ModuleBody width="full">
            <ListSearchToolbar
              filters={
                <ListOptions
                  path="/biblioteca"
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
            />
            {result.items.length === 0 ? (
              <ListEmptyBlock
                title={selectedType ? "No hay entrenamientos con estos filtros" : "Todavía no hay entrenamientos"}
                href={selectedType ? listOptionsHref("/biblioteca", {}, order, TRAINING_SORTS[0].value) : undefined}
                action={selectedType ? "Restablecer filtros" : undefined}
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {result.items.map((item) => (
                  <li key={item.id}>
                    <Link href={`/biblioteca/${item.id}`} className="flex flex-col gap-1 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm text-muted-foreground">{item.classTypeName}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <ListPagination
              pageInfo={result.pageInfo}
              path="/biblioteca"
              filters={{ tipo: selectedType?.slug, orden: order === TRAINING_SORTS[0].value ? undefined : order }}
            />
          </ModuleBody>
        </ModulePage>
      )}
    </QueryBody>
  );
}
