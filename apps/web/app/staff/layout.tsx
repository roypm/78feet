import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/current";
import { StaffShell } from "@/components/staff/staff-shell";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-muted-foreground">Cargando…</p>}>
      <StaffGate>{children}</StaffGate>
    </Suspense>
  );
}

async function StaffGate({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  return <StaffShell role={user.role === "admin" ? "admin" : "coach"}>{children}</StaffShell>;
}
