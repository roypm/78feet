import { ProfilePhotoEditor } from "@/components/account/profile-photo-editor";
import { BoxPreferencePanel } from "@/components/account/box-preference-panel";
import { ThemePreferencePanel } from "@/components/account/theme-preference-panel";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { displayPhone, emptyField } from "@/lib/box/format";
import { listBoxes } from "@/lib/server/queries";
import { QueryBody, useAccountQuery } from "@/lib/spa/screen";

const pending = (
  <ModulePage>
    <ModuleHeader title="Mi perfil" description="Consultá tus datos personales." />
    <ModuleBody>
      <LoadingState variant="profile" label="Cargando tu perfil…" />
    </ModuleBody>
  </ModulePage>
);

export default function Page() {
  const { account, query } = useAccountQuery(["boxes", "profile"], () => listBoxes());
  return (
    <QueryBody query={query} accountReady={account !== null} pending={pending} home="/calendario">
      {(boxes) => {
        if (!account) return pending;
        const rows = [
          { label: "Nombre", value: `${account.firstName} ${account.lastName}`.trim() },
          { label: "DNI", value: account.dni },
          { label: "Teléfono", value: displayPhone(account.phone) },
          { label: "Email", value: account.email },
        ];
        return (
          <ModulePage>
            <ModuleHeader title="Mi perfil" description="Consultá tus datos personales." />
            <ModuleBody>
              <ProfilePhotoEditor name={`${account.firstName} ${account.lastName}`.trim()} imageUrl={account.profileImageUrl} />
              <ThemePreferencePanel />
              <BoxPreferencePanel boxes={boxes} preferenceBoxId={account.preferenceBoxId} />
              <div className="flex flex-col gap-4 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
                <dl className="flex flex-col gap-4">
                  {rows.map((row) => (
                    <div key={row.label} className="min-w-0">
                      <dt className="text-sm text-muted-foreground">{row.label}</dt>
                      <dd className="wrap-break-word">{emptyField(row.value)}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-sm text-muted-foreground">Para cambiar estos datos, hablá con el box.</p>
              </div>
            </ModuleBody>
          </ModulePage>
        );
      }}
    </QueryBody>
  );
}
