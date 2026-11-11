import { cookies } from "next/headers";
import { MemberShell } from "@/components/common/navigation/member-shell";
import { requireMember } from "@/lib/auth/current";
import { getProfileImageUrlForUser } from "@/lib/box/profile-images";

export const instant = false;

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await requireMember();
  const displayName = `${user.firstName} ${user.lastName}`.trim();
  const profileImageUrl = await getProfileImageUrlForUser(user.id);
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";

  return <MemberShell displayName={displayName} profileImageUrl={profileImageUrl} defaultOpen={defaultOpen}>{children}</MemberShell>;
}
