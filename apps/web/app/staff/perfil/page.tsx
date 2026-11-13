import { ProfilePhotoEditor } from "@/components/account/profile-photo-editor";
import { BoxPreferencePanel } from "@/components/account/box-preference-panel";
import { ThemePreferencePanel } from "@/components/account/theme-preference-panel";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { Badge } from "@/components/ui/badge";
import { displayPhone, emptyField } from "@/lib/box/format";
import { listBoxes } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Mi perfil" />
    <ModuleBody>
      <LoadingState variant="profile" label="Cargando tu perfil…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const { account, query } = useAccountQuery(["boxes", "staff-profile"], () => listBoxes());
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/staff/hoy">
      {(boxes) => {
        if (!account) return pending;
        const rows = [
          { label: "Nombre", value: `${account.firstName} ${account.lastName}`.trim() },
          { label: "DNI", value: account.dni },
          { label: "Teléfono", value: displayPhone(account.phone) },
          { label: "Correo", value: account.email },
          { label: "Usuario de acceso", value: account.loginId },
          { label: "Rol", value: account.role === "admin" ? "Admin" : "Coach" },
        ];
        return (
          <ModulePage>
            <ModuleHeader title="Mi perfil" description="Tus datos personales y de acceso." />
            <ModuleBody>
              <ProfilePhotoEditor name={`${account.firstName} ${account.lastName}`.trim()} imageUrl={account.profileImageUrl} />
              <ThemePreferencePanel />
              <BoxPreferencePanel boxes={boxes} preferenceBoxId={account.preferenceBoxId} />
              <section className="rounded-lg bg-card p-4 ring-1 ring-foreground/10 md:p-6">
                <div className="mb-5">
                  <Badge variant="secondary">{account.role === "admin" ? "Admin" : "Coach"}</Badge>
                </div>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {rows.map((row) => (
                    <div key={row.label} className="min-w-0">
                      <dt className="text-sm text-muted-foreground">{row.label}</dt>
                      <dd className="wrap-break-word">{emptyField(row.value)}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-5 text-sm text-muted-foreground">Para cambiar tus datos, pedí ayuda a un admin.</p>
              </section>
            </ModuleBody>
          </ModulePage>
        );
      }}
    </QueryBody>
  );
}
