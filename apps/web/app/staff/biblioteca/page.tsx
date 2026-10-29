import { Suspense } from "react";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/current";
import { listTrainingFilterTypes, listTrainings } from "@/lib/box/trainings";
import { Button } from "@/components/ui/button";
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
          <ModuleHeader title="Biblioteca" />
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
        action={
          <Button nativeButton={false} render={<Link href="/staff/biblioteca/nuevo" />}>
            Nuevo
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2">
          <FilterChip href="/staff/biblioteca" active={!classTypeId}>
            Todos
          </FilterChip>
          {types.map((type) => (
            <FilterChip
              key={type.id}
              href={`/staff/biblioteca?tipo=${type.id}`}
              active={classTypeId === type.id}
            >
              {type.name}
            </FilterChip>
          ))}
        </div>
      </ModuleHeader>
      <ModuleBody>
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

function FilterChip({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "flex min-h-8 items-center rounded-sm bg-muted px-2.5 text-sm font-semibold"
          : "flex min-h-8 items-center rounded-sm px-2.5 text-sm text-muted-foreground"
      }
    >
      {children}
    </Link>
  );
}
