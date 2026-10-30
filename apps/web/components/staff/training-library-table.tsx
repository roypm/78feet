"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type StaffTrainingCard = {
  id: string;
  name: string;
  classTypeId: string;
  classTypeName: string;
  phaseNames: string[];
};

export function TrainingLibraryTable({
  trainings,
  hasTypeFilter,
}: {
  trainings: StaffTrainingCard[];
  hasTypeFilter: boolean;
}) {
  const router = useRouter();

  if (trainings.length === 0) {
    return (
      <p className="rounded-lg bg-card p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
        {hasTypeFilter ? "Este tipo todavía no tiene entrenamientos." : "Todavía no hay entrenamientos."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2 md:hidden">
        {trainings.map((training) => (
          <li key={training.id}>
            <Link
              href={`/staff/biblioteca/${training.id}`}
              className="flex min-h-16 flex-col justify-center gap-1 rounded-lg bg-card px-3 py-2.5 ring-1 ring-foreground/10"
            >
              <span className="font-medium wrap-break-word">{training.name}</span>
              <span className="text-sm text-muted-foreground">{training.classTypeName}</span>
              <span className="text-sm wrap-break-word">
                {training.phaseNames.length > 0 ? training.phaseNames.join(" · ") : "Sin fases"}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-lg bg-card ring-1 ring-foreground/10 md:block">
        <Table className="min-w-[42rem]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-10 px-3">Entrenamiento</TableHead>
              <TableHead className="h-10 px-3">Tipo</TableHead>
              <TableHead className="h-10 px-3">Fases de la sesión</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trainings.map((training) => (
              <TableRow
                key={training.id}
                role="link"
                tabIndex={0}
                aria-label={`Abrir entrenamiento ${training.name}`}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                onClick={() => router.push(`/staff/biblioteca/${training.id}`)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/staff/biblioteca/${training.id}`);
                  }
                }}
              >
                <TableCell className="max-w-0 px-3 py-2.5 font-medium">
                  <span className="block truncate" title={training.name}>{training.name}</span>
                </TableCell>
                <TableCell className="px-3 py-2.5 text-muted-foreground">{training.classTypeName}</TableCell>
                <TableCell className="max-w-0 px-3 py-2.5">
                  <span className="block truncate text-sm text-muted-foreground" title={training.phaseNames.join(" · ")}>
                    {training.phaseNames.length > 0 ? training.phaseNames.join(" · ") : "Sin fases"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

    </div>
  );
}
