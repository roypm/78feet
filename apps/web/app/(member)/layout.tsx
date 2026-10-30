import { MemberShell } from "@/components/member/member-shell";

export const instant = false;

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <MemberShell>{children}</MemberShell>;
}
