import { LoadingState } from "@/components/feedback/loading-state";
import { ListPagination } from "@/components/member/list-pagination";
import { pageNumber } from "@/lib/box/pagination";
import { Suspense } from "react";
import { NavigationLink as Link } from "@/components/feedback/navigation-link";
import { requireStaff } from "@/lib/auth/current";
import { listStaffTrainingsPage, listTrainingFilterTypes } from "@/lib/box/trainings";
import { Button } from "@/components/ui/button";
import { QueryFilter } from "@/components/member/query-filter";
import { TrainingLibraryTable } from "@/components/staff/training-library-table";
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

async function Library({ searchParams }: { searchParams: Promise<{ tipo?: string; pagina?: string }> }) {
  await requireStaff();
  const query = await searchParams;
  const classTypeId = query.tipo && query.tipo !== "todos" ? query.tipo : undefined;
  const [result, types] = await Promise.all([listStaffTrainingsPage(classTypeId, pageNumber(query.pagina)), listTrainingFilterTypes()]);

  const trainings = result.items;

  return (
    <ModulePage>
      <ModuleHeader title="Biblioteca" description="Entrenamientos reutilizables por tipo dirigido." />
      <ModuleBody width="full" inset="content">
        <TrainingLibraryTable
          trainings={trainings}
          hasTypeFilter={Boolean(classTypeId)}
          filters={
            <QueryFilter
              ariaLabel="Tipo de entrenamiento"
              chipCount={types.length}
              active={classTypeId ?? "todos"}
              options={[
                { value: "todos", label: "Todos", href: "/staff/biblioteca" },
                ...types.map((type) => ({
                  value: type.id,
                  label: type.name,
                  href: `/staff/biblioteca?tipo=${type.id}`,
                })),
              ]}
            />
          }
          action={
          <Button nativeButton={false} variant="outline" className="min-h-11" render={<Link href="/staff/biblioteca/nuevo" />}>
            Nuevo entrenamiento
          </Button>
        } />
        <ListPagination pageInfo={result.pageInfo} path="/staff/biblioteca" filters={{ tipo: query.tipo }} />
      </ModuleBody>
    </ModulePage>
  );
}
