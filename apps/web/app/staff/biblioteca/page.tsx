import { Suspense } from "react";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/current";
import { listTrainingFilterTypes, listTrainings } from "@/lib/box/trainings";
import { Button } from "@/components/ui/button";
import { FilterTabLink, FilterTabs } from "@/components/member/kind-tabs";
import { ModuleBody, ModuleHeader, ModulePage, ModulePrimaryAction } from "@/components/member/module-page";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
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

async function Library({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  await requireStaff();
  const query = await searchParams;
  const classTypeId = query.tipo && query.tipo !== "todos" ? query.tipo : undefined;
  const [trainings, types] = await Promise.all([listTrainings(classTypeId), listTrainingFilterTypes()]);

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
      <ModuleBody inset="content">
        <ModulePrimaryAction>
          <Button nativeButton={false} variant="outline" className="min-h-11" render={<Link href="/staff/biblioteca/nuevo" />}>
            Nuevo entrenamiento
          </Button>
        </ModulePrimaryAction>
        {trainings.length === 0 ? (
          <p className="text-muted-foreground">Todavía no hay entrenamientos.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {trainings.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/staff/biblioteca/${item.id}`}
                  className="flex flex-col gap-1 rounded-lg bg-card p-3 ring-1 ring-foreground/10"
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground">{item.classTypeName}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </ModuleBody>
    </ModulePage>
  );
}
