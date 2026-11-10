
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { ListPagination } from "@/components/member/list-pagination";
import { pageNumber } from "@/lib/box/pagination";
import { Suspense } from "react";
import { NavigationLink as Link } from "@/components/feedback/navigation-link";
import { requireMember } from "@/lib/auth/current";
import { listTrainingFilterTypes, listTrainingsPage } from "@/lib/box/trainings";
import { QueryFilter } from "@/components/member/query-filter";
import { ListSearchToolbar } from "@/components/staff/list-search-toolbar";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; pagina?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Biblioteca" description="Entrenamientos de clases dirigidas." />
          <ModuleBody>
            <LoadingState variant="list" label="Cargando la biblioteca…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <Library searchParams={searchParams} />
    </Suspense>
  );
}

async function Library({ searchParams }: { searchParams: Promise<{ tipo?: string; pagina?: string }> }) {
  await requireMember();
  const query = await searchParams;
  const classTypeId = query.tipo && query.tipo !== "todos" ? query.tipo : undefined;
  const [result, types] = await Promise.all([listTrainingsPage(classTypeId, pageNumber(query.pagina)), listTrainingFilterTypes()]);

  const trainings = result.items;

  return (
    <ModulePage>
      <ModuleHeader title="Biblioteca" description="Entrenamientos de clases dirigidas." />
      <ModuleBody>
        <ListSearchToolbar
          filters={
            <QueryFilter
              ariaLabel="Tipo de entrenamiento"
              chipCount={types.length}
              active={classTypeId ?? "todos"}
              options={[
                { value: "todos", label: "Todos", href: "/biblioteca" },
                ...types.map((type) => ({
                  value: type.id,
                  label: type.name,
                  href: `/biblioteca?tipo=${type.id}`,
                })),
              ]}
            />
          }
        />
        {trainings.length === 0 ? (
          <EmptyState title={classTypeId ? "No hay entrenamientos de este tipo" : "Todavía no hay entrenamientos"} description={classTypeId ? "Probá con otro tipo de clase o volvé a ver toda la biblioteca." : "Los entrenamientos aparecerán acá cuando el staff los publique."} href={classTypeId ? "/biblioteca" : undefined} action={classTypeId ? "Ver todos" : undefined} />
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
        <ListPagination pageInfo={result.pageInfo} path="/biblioteca" filters={{ tipo: query.tipo }} />
      </ModuleBody>
    </ModulePage>
  );
}
