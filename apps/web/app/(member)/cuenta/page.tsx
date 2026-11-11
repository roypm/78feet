import { ThemePreferencePanel } from "@/components/account/theme-preference-panel";
import { BoxPreferencePanel } from "@/components/account/box-preference-panel";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { EmptyState } from "@/components/common/feedback/empty-state";
import { Suspense } from "react";
import { requireMember } from "@/lib/auth/current";
import { listBoxes } from "@/lib/box/boxes";
import { emptyField, displayPhone } from "@/lib/box/format";
import { getOwnProfile } from "@/lib/box/summary";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { ProfilePhotoEditor } from "@/components/account/profile-photo-editor";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Mi perfil" description="Consultá tus datos personales." />
          <ModuleBody>
            <LoadingState variant="profile" label="Cargando tu perfil…" />
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
  const boxes = await listBoxes();
  if (!profile) {
    return (
      <ModulePage>
        <ModuleHeader title="Mi perfil" description="Consultá tus datos personales." />
        <ModuleBody>
          <EmptyState title="No encontramos los datos de tu cuenta" description="Hablá con el staff para revisar tus datos personales." />
        </ModuleBody>
      </ModulePage>
    );
  }

  const rows = [
    { label: "Nombre", value: `${profile.firstName} ${profile.lastName}`.trim() },
    { label: "DNI", value: profile.dni },
    { label: "Teléfono", value: displayPhone(profile.phone) },
    { label: "Email", value: profile.email },
  ];

  return (
    <ModulePage>
      <ModuleHeader title="Mi perfil" description="Consultá tus datos personales." />
      <ModuleBody>
        <ProfilePhotoEditor name={`${profile.firstName} ${profile.lastName}`.trim()} imageUrl={profile.profileImageUrl} />
        <ThemePreferencePanel />
        <BoxPreferencePanel boxes={boxes} preferenceBoxId={user.preferenceBoxId} />
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
}
