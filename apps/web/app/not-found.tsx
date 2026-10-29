import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-8 text-foreground">
      <section className="flex w-full max-w-lg flex-col items-start gap-4 rounded-lg border border-border bg-card p-6">
        <p className="text-sm font-semibold text-primary">78feet · 404</p>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Página no encontrada</h1>
          <p className="text-muted-foreground">La dirección puede haber cambiado o no existe.</p>
        </div>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 font-medium text-primary-foreground transition active:scale-[0.97]"
        >
          Ir al inicio
        </Link>
      </section>
    </main>
  );
}
