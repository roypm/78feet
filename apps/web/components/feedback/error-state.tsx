"use client";

import { Button } from "@/components/ui/button";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";
import { EmptyState } from "./empty-state";

export function ErrorState({
  reset,
  home = "/",
  standalone = false,
}: {
  reset: () => void;
  home?: string;
  standalone?: boolean;
}) {
  const content = (
    <EmptyState
      title="El contenido no está disponible ahora"
      description="Comprobá tu conexión e intentá cargar esta pantalla otra vez."
      href={home}
      action="Volver al inicio"
    >
      <Button type="button" className="min-h-11" onClick={reset}>
        Volver a cargar
      </Button>
    </EmptyState>
  );
  if (standalone) return <section className="m-auto w-full max-w-lg p-4">{content}</section>;
  return (
    <ModulePage>
      <ModuleHeader title="No se pudo cargar" description="Probá de nuevo para recuperar el contenido." />
      <ModuleBody>{content}</ModuleBody>
    </ModulePage>
  );
}
