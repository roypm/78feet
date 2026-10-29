import Link from "next/link";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function NotFound() {
  return (
    <ModulePage>
      <ModuleHeader title="Página no encontrada" />
      <ModuleBody>
        <p className="text-muted-foreground">El contenido puede haberse movido o ya no estar disponible.</p>
        <Link href="/" className="text-primary">
          Volver al inicio
        </Link>
      </ModuleBody>
    </ModulePage>
  );
}
