import { cookies } from "next/headers";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/current";
import { StaffShell } from "@/components/common/navigation/staff-shell";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { getProfileImageUrlForUser } from "@/lib/box/profile-images";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-5xl px-4 py-8"><LoadingState variant="profile" label="Cargando el panel…" /></div>}>
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
