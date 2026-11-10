import { ThemePreferencePanel } from "@/components/member/theme-preference-panel";
import { BoxPreferencePanel } from "@/components/member/box-preference-panel";
import { Suspense } from "react";
import { LoadingState } from "@/components/feedback/loading-state";
import { requireStaff } from "@/lib/auth/current";
import { listBoxes } from "@/lib/box/boxes";
import { Badge } from "@/components/ui/badge";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";
import { ProfilePhotoEditor } from "@/components/member/profile-photo-editor";
import { emptyField, displayPhone } from "@/lib/box/format";
import { getProfileImageUrlForUser } from "@/lib/box/profile-images";

export default function Page() {
  return (
    <Suspense fallback={<ModulePage><ModuleHeader title="Mi perfil" /><ModuleBody><LoadingState variant="profile" label="Cargando tu perfil…" /></ModuleBody></ModulePage>}>
      <OwnStaffProfile />
    </Suspense>
  );
}

async function OwnStaffProfile() {
  const user = await requireStaff();
  const imageUrl = await getProfileImageUrlForUser(user.id);
  const boxes = await listBoxes();
  const rows = [
    { label: "Nombre", value: `${user.firstName} ${user.lastName}`.trim() },
    { label: "DNI", value: user.dni },
    { label: "Teléfono", value: displayPhone(user.phone) },
    { label: "Correo", value: user.email },
    { label: "Usuario de acceso", value: user.loginId },
    { label: "Rol", value: user.role === "admin" ? "Admin" : "Coach" },
  ];

  return (
    <ModulePage>
      <ModuleHeader title="Mi perfil" description="Tus datos personales y de acceso." />
      <ModuleBody>
        <ProfilePhotoEditor name={`${user.firstName} ${user.lastName}`.trim()} imageUrl={imageUrl} />
        <ThemePreferencePanel />
        <BoxPreferencePanel boxes={boxes} preferenceBoxId={user.preferenceBoxId} />
        <section className="rounded-lg bg-card p-4 ring-1 ring-foreground/10 md:p-6">
          <div className="mb-5">
            <Badge variant="secondary">{user.role === "admin" ? "Admin" : "Coach"}</Badge>
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
}
