import { Suspense } from "react";
import { requireMember } from "@/lib/auth/current";
import { getOwnProfile } from "@/lib/box/summary";
import { LogoutButton } from "@/components/member/logout-button";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Mi cuenta" />
          <ModuleBody>
            <p className="text-muted-foreground">Cargando tu cuenta…</p>
          </ModuleBody>
        </ModulePage>
      }
    >
      <Account />
    </Suspense>
  );
}

async function Account() {
  const user = await requireMember();
  const profile = await getOwnProfile(user.id);
  if (!profile) {
    return (
      <ModulePage>
        <ModuleHeader title="Mi cuenta" />
        <ModuleBody>
          <p className="text-muted-foreground">No encontramos tu cuenta.</p>
        </ModuleBody>
      </ModulePage>
    );
  }

  const rows = [
    { label: "Nombre", value: `${profile.firstName} ${profile.lastName}`.trim() },
    { label: "DNI", value: profile.dni },
    { label: "Teléfono", value: profile.phone },
    { label: "Email", value: profile.email },
  ].filter((row): row is { label: string; value: string } => Boolean(row.value));

  return (
    <ModulePage>
      <ModuleHeader title="Mi cuenta" />
      <ModuleBody>
        <div className="flex flex-col gap-4 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
          <dl className="flex flex-col gap-4">
            {rows.map((row) => (
              <div key={row.label} className="min-w-0">
                <dt className="text-sm text-muted-foreground">{row.label}</dt>
                <dd className="wrap-break-word">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted-foreground">Para cambiar estos datos, hablá con el box.</p>
        </div>
        <LogoutButton />
      </ModuleBody>
    </ModulePage>
  );
}
