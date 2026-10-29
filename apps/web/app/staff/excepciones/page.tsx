import { Suspense } from "react";
import Link from "next/link";
import { localDateString } from "@78feet/domain";
import { requireStaff } from "@/lib/auth/current";
import { listDay } from "@/lib/box/staff-calendar";
import { listClassTypes } from "@/lib/box/class-types";
import { listCoaches } from "@/lib/box/staff-users";
import { formatDay, formatTime, kindLabel } from "@/lib/box/format";
import { ExtraClassForm } from "@/components/staff/instance-form";
import { Badge } from "@/components/ui/badge";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Excepciones" />
          <ModuleBody>
            <p className="text-muted-foreground">Cargando el día…</p>
          </ModuleBody>
        </ModulePage>
      }
    >
      <Exceptions searchParams={searchParams} />
    </Suspense>
  );
}

async function Exceptions({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireStaff();
  const query = await searchParams;
  const date = query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : localDateString(new Date());
  const [classes, classTypes, coaches] = await Promise.all([
    listDay(date),
    listClassTypes(),
    listCoaches(),
  ]);

  return (
    <ModulePage>
      <ModuleHeader title="Excepciones">
        <form className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            Día
            <input
              type="date"
              name="date"
              defaultValue={date}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-base"
            />
          </label>
          <button type="submit" className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
            Ver
          </button>
        </form>
      </ModuleHeader>
      <ModuleBody>
        <p className="text-sm text-muted-foreground">{formatDay(date)}</p>
        {classes.length === 0 ? (
          <p className="text-muted-foreground">No hay clases este día.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {classes.map((item) => (
              <li key={item.id} className="flex flex-col gap-2 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {formatTime(new Date(item.startAt))}–{formatTime(new Date(item.endAt))} · {item.bookedCount}/
                      {item.capacity}
                    </p>
                  </div>
                  <Badge variant={item.kind === "directed" ? "default" : "secondary"}>{kindLabel(item.kind)}</Badge>
                </div>
                <Link href={`/staff/clases/${item.id}`} className="text-sm text-primary">
                  Modificar
                </Link>
              </li>
            ))}
          </ul>
        )}
        <section className="flex flex-col gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="font-medium">Añadir clase extra</h2>
          {classTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Primero el admin tiene que crear un tipo de clase.</p>
          ) : (
            <ExtraClassForm date={date} classTypes={classTypes} coaches={coaches} />
          )}
        </section>
      </ModuleBody>
    </ModulePage>
  );
}
