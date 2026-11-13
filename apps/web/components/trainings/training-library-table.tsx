
import { NavigationLink as Link } from "@/components/common/navigation/navigation-link";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { ListSearchToolbar } from "@/components/common/lists/list-search-toolbar";
import { SearchEmptyState } from "@/components/common/lists/search-empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { matchesSearch, searchHaystack } from "@/lib/ui/search";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { Spinner } from "@/components/ui/spinner";
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
  emptyState,
  action,
  filters,
}: {
  trainings: StaffTrainingCard[];
  emptyState: ReactNode;
  action?: ReactNode;
  filters?: ReactNode;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => trainings.filter((training) =>
    matchesSearch(query, searchHaystack([training.name, training.classTypeName]))), [trainings, query]);
  const { router, pending } = useActionFeedback();
  const [openingId, setOpeningId] = useState<string | null>(null);
  function openTraining(id: string) {
    setOpeningId(id);
    router.push(`/staff/biblioteca/${id}`);
  }

  function clearQuery() {
    setQuery("");
    searchRef.current?.focus({ preventScroll: true });
  }

  return (
    <div className="flex flex-col gap-3">
      <ListSearchToolbar action={action} filters={filters}>
        <SearchInput ref={searchRef} aria-label="Buscar entrenamientos en esta página" placeholder="Buscar por nombre o tipo…"
          value={query} onValueChange={setQuery} />
      </ListSearchToolbar>
      {trainings.length === 0 ? emptyState : filtered.length === 0 ? (
        <SearchEmptyState
          onClear={clearQuery}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2 md:hidden">
            {filtered.map((training) => (
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
                <TableRow className="pointer-hover:bg-transparent">
                  <TableHead className="h-10 px-3">Entrenamiento</TableHead>
                  <TableHead className="h-10 px-3">Tipo</TableHead>
                  <TableHead className="h-10 px-3">Fases de la sesión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((training) => (
                  <TableRow
                    key={training.id}
                    role="link"
                    tabIndex={0}
                    aria-busy={pending && openingId === training.id}
                    aria-label={`Abrir entrenamiento ${training.name}`}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    onClick={() => openTraining(training.id)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openTraining(training.id);
                      }
                    }}
                  >
                    <TableCell className="max-w-0 px-3 py-2.5 font-medium">
                      <span className="flex items-center gap-2"><span className="truncate" title={training.name}>{training.name}</span>{pending && openingId === training.id && <Spinner aria-label="Abriendo entrenamiento" />}</span>
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
        </>
      )}
    </div>
  );
}
