import { ListPagination } from "@/components/member/list-pagination";
import { pageNumber } from "@/lib/box/pagination";
import { Suspense } from "react";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/current";
import { listStaffTrainingsPage, listTrainingFilterTypes } from "@/lib/box/trainings";
import { Button } from "@/components/ui/button";
import { FilterTabLink, FilterTabs } from "@/components/member/kind-tabs";
import { TrainingLibraryTable } from "@/components/staff/training-library-table";
import { ModuleBody, ModuleHeader, ModulePage, ModulePrimaryAction } from "@/components/member/module-page";

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
            <p className="text-muted-foreground">Cargando la biblioteca…</p>
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
      <ModuleHeader
        title="Biblioteca"
        description="Entrenamientos reutilizables por tipo dirigido."
        tabs={
          <FilterTabs aria-label="Tipo de entrenamiento">
            <FilterTabLink href="/staff/biblioteca" active={!classTypeId}>
              Todos
            </FilterTabLink>
            {types.map((type) => (
              <FilterTabLink
                key={type.id}
                href={`/staff/biblioteca?tipo=${type.id}`}
                active={classTypeId === type.id}
              >
                {type.name}
              </FilterTabLink>
            ))}
          </FilterTabs>
        }
      />
      <ModuleBody width="full" inset="content">
        <ModulePrimaryAction>
          <Button nativeButton={false} variant="outline" className="min-h-11" render={<Link href="/staff/biblioteca/nuevo" />}>
            Nuevo entrenamiento
          </Button>
        </ModulePrimaryAction>
        <TrainingLibraryTable trainings={trainings} hasTypeFilter={Boolean(classTypeId)} />
        <ListPagination pageInfo={result.pageInfo} path="/staff/biblioteca" filters={{ tipo: query.tipo }} />
      </ModuleBody>
    </ModulePage>
  );
}
