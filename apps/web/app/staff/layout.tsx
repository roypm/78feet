import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/current";
import { StaffShell } from "@/components/staff/staff-shell";
import { LoadingState } from "@/components/feedback/loading-state";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-5xl px-4 py-8"><LoadingState variant="profile" label="Cargando el panel…" /></div>}>
      <StaffGate>{children}</StaffGate>
    </Suspense>
  );
}

async function StaffGate({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  return <StaffShell role={user.role === "admin" ? "admin" : "coach"}>{children}</StaffShell>;
}
