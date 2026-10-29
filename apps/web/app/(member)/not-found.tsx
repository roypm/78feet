import Link from "next/link";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function NotFound() {
  return (
    <ModulePage>
      <ModuleHeader title="No encontramos esa clase" />
      <ModuleBody>
        <Link href="/calendario" className="text-primary">
          Volver al calendario
        </Link>
      </ModuleBody>
    </ModulePage>
  );
}
