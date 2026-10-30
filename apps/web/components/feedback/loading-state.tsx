import { Skeleton } from "@/components/ui/skeleton";

export type LoadingVariant =
  "list" | "table" | "library" | "catalog" | "calendar" | "profile" | "form" | "training" | "class";

export function LoadingState({
  variant = "list",
  label = "Cargando…",
  fields = 5,
}: {
  variant?: LoadingVariant;
  label?: string;
  fields?: number;
}) {
  return (
    <div role="status" aria-label={label} className="w-full min-w-0">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="flex flex-col gap-3">
        {variant === "calendar" ? (
          <>
            <Skeleton className="h-9 w-64 max-w-full" />
            <div className="grid min-h-80 grid-cols-[2.5rem_repeat(7,minmax(0,1fr))] gap-2 overflow-hidden rounded-lg border border-border p-3">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-72" />
              ))}
            </div>
          </>
        ) : variant === "table" || variant === "library" ? (
          <>
            {variant === "library" && (
              <div className="flex flex-col gap-3 md:hidden">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                    <Skeleton className="h-5 w-2/5" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            )}
            <div
              className={`${variant === "library" ? "hidden md:block " : ""}overflow-hidden rounded-lg border border-border bg-card p-3`}
            >
              <Skeleton className="mb-4 h-8 w-56 max-w-full" />
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="grid grid-cols-[2fr_1fr_1fr] gap-4 border-t border-border py-4">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          </>
        ) : variant === "form" ? (
          <div className="flex max-w-2xl flex-col gap-5">
            {Array.from({ length: fields }, (_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-11 w-full" />
              </div>
            ))}
            <Skeleton className="h-11 w-40" />
          </div>
        ) : (
          <div className={variant === "catalog" ? "grid gap-3 lg:grid-cols-2" : "flex flex-col gap-3"}>
            {variant === "class" && <Skeleton className="h-40 w-full max-w-2xl" />}
            {Array.from({ length: variant === "profile" ? 3 : 4 }, (_, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                <Skeleton className="h-5 w-2/5" />
                <Skeleton className="h-4 w-3/4" />
                {variant !== "list" && <Skeleton className={variant === "training" ? "h-20 w-full" : "h-4 w-1/2"} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
