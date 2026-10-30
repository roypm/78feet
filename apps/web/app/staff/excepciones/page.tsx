
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Suspense } from "react";
import { localDateString } from "@78feet/domain";
import { requireStaff } from "@/lib/auth/current";
import { listExceptions } from "@/lib/box/exceptions";
import { listClassTypes } from "@/lib/box/class-types";
import { listCoaches } from "@/lib/box/staff-users";
import { ExtraClassForm } from "@/components/staff/extra-class-form";
import { ExceptionsList } from "@/components/staff/exceptions-list";
import { ModuleBody, ModuleHeader, ModulePage, ModulePrimaryAction } from "@/components/member/module-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Excepciones" />
          <ModuleBody>
            <LoadingState variant="list" label="Cargando excepciones…" />
          </ModuleBody>
        </ModulePage>
      }
    >
      <Exceptions />
    </Suspense>
  );
}

async function Exceptions() {
  const user = await requireStaff();
  const today = localDateString(new Date());
  const [items, classTypes, coaches] = await Promise.all([
    listExceptions(today),
    listClassTypes(),
    listCoaches(),
  ]);

  return (
    <ModulePage>
      <ModuleHeader
        title="Excepciones"
        description="Solo lo que no sigue la plantilla al pie de la letra: clases extra, instancias modificadas o canceladas. Podés añadir una extra en cualquier fecha futura, también más allá del calendario visible en Semana."
      />
      <ModuleBody width="full" inset="content">
        {classTypes.length === 0 ? (
          <EmptyState title="Primero hace falta un tipo de clase" description={user.role === "admin" ? "Creá un tipo antes de añadir clases extra." : "Pedile al admin que cree un tipo de clase para poder añadir sesiones."} href={user.role === "admin" ? "/staff/tipos" : undefined} action="Crear tipo" />
        ) : (
          <>
            <ModulePrimaryAction>
              <ExtraClassForm defaultDate={today} classTypes={classTypes} coaches={coaches} />
            </ModulePrimaryAction>
            <ExceptionsList items={items} />
          </>
        )}
      </ModuleBody>
    </ModulePage>
  );
}
