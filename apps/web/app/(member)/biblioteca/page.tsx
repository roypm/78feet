import { Suspense } from "react";
import Link from "next/link";
import { requireMember } from "@/lib/auth/current";
import { listTrainingFilterTypes, listTrainings } from "@/lib/box/trainings";
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
  await requireMember();
  const query = await searchParams;
  const classTypeId = query.tipo && query.tipo !== "todos" ? query.tipo : undefined;
  const [trainings, types] = await Promise.all([listTrainings(classTypeId), listTrainingFilterTypes()]);

  return (
    <ModulePage>
      <ModuleHeader title="Biblioteca">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/biblioteca"
            className={
              !classTypeId
                ? "flex min-h-8 items-center rounded-sm bg-muted px-2.5 text-sm font-semibold"
                : "flex min-h-8 items-center rounded-sm px-2.5 text-sm text-muted-foreground"
            }
          >
            Todos
          </Link>
          {types.map((type) => (
            <Link
              key={type.id}
              href={`/biblioteca?tipo=${type.id}`}
              className={
                classTypeId === type.id
                  ? "flex min-h-8 items-center rounded-sm bg-muted px-2.5 text-sm font-semibold"
                  : "flex min-h-8 items-center rounded-sm px-2.5 text-sm text-muted-foreground"
              }
            >
              {type.name}
            </Link>
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
