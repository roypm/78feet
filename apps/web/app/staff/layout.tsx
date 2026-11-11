import { cookies } from "next/headers";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/current";
import { StaffShell } from "@/components/common/navigation/staff-shell";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { getProfileImageUrlForUser } from "@/lib/box/profile-images";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh min-w-0 bg-background text-foreground">
          <ModulePage>
            <ModuleHeader title="Cargando el panel…" sidebarTrigger={false} />
            <ModuleBody>
              <LoadingState variant="profile" label="Cargando el panel…" />
            </ModuleBody>
          </ModulePage>
        </main>
      }
    >
      <StaffGate>{children}</StaffGate>
    </Suspense>
  );
}

async function StaffGate({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const displayName = `${user.firstName} ${user.lastName}`.trim();
  const profileImageUrl = await getProfileImageUrlForUser(user.id);
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  return <StaffShell role={user.role === "admin" ? "admin" : "coach"} displayName={displayName} profileImageUrl={profileImageUrl} defaultOpen={defaultOpen}>{children}</StaffShell>;
}
