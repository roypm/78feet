import { Suspense } from "react";
import Link from "next/link";
import { requireMember } from "@/lib/auth/current";
import { listTrainingFilterTypes, listTrainings } from "@/lib/box/trainings";
import { FilterTabLink, FilterTabs } from "@/components/member/kind-tabs";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Biblioteca" description="Entrenamientos de clases dirigidas." />
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
  await requireMember();
  const query = await searchParams;
  const classTypeId = query.tipo && query.tipo !== "todos" ? query.tipo : undefined;
  const [trainings, types] = await Promise.all([listTrainings(classTypeId), listTrainingFilterTypes()]);

  return (
    <ModulePage>
      <ModuleHeader
        title="Biblioteca"
        description="Entrenamientos de clases dirigidas."
        tabs={
          <FilterTabs aria-label="Tipo de entrenamiento">
            <FilterTabLink href="/biblioteca" active={!classTypeId}>
              Todos
            </FilterTabLink>
            {types.map((type) => (
              <FilterTabLink
                key={type.id}
                href={`/biblioteca?tipo=${type.id}`}
                active={classTypeId === type.id}
              >
                {type.name}
              </FilterTabLink>
            ))}
          </FilterTabs>
        }
      />
      <ModuleBody>
        {trainings.length === 0 ? (
          <p className="text-muted-foreground">Todavía no hay entrenamientos.</p>
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
      </ModuleBody>
    </ModulePage>
  );
}
