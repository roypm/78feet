import { LoadingState } from "@/components/feedback/loading-state";

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      <LoadingState variant="form" fields={2} label="Cargando el acceso…" />
    </main>
  );
}
