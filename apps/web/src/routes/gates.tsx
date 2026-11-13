import { Navigate, Outlet } from "react-router";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/common/layout/module-page";
import { MemberShell } from "@/components/common/navigation/member-shell";
import { StaffShell } from "@/components/common/navigation/staff-shell";
import { useSession } from "@/lib/spa/session";

function sidebarOpen() {
  return !/(?:^|; )sidebar_state=false(?:;|$)/.test(document.cookie);
}

function PanelLoading({ title, label }: { title: string; label: string }) {
  return (
    <main className="flex min-h-dvh min-w-0 bg-background text-foreground">
      <ModulePage>
        <ModuleHeader title={title} sidebarTrigger={false} />
        <ModuleBody>
          <LoadingState variant="profile" label={label} />
        </ModuleBody>
      </ModulePage>
    </main>
  );
}

export function MemberGate() {
  const session = useSession();
  if (session.isPending) return <PanelLoading title="Cargando…" label="Cargando tu cuenta…" />;
  if (session.isError) return <ErrorState reset={() => void session.refetch()} home="/login" standalone />;
  if (!session.data) return <Navigate to="/login" replace />;
  if (session.data.role !== "member") return <Navigate to="/staff/hoy" replace />;
  return (
    <MemberShell
      displayName={`${session.data.firstName} ${session.data.lastName}`.trim()}
      profileImageUrl={session.data.profileImageUrl}
      defaultOpen={sidebarOpen()}
    >
      <Outlet />
    </MemberShell>
  );
}

export function StaffGate() {
  const session = useSession();
  if (session.isPending) return <PanelLoading title="Cargando el panel…" label="Cargando el panel…" />;
  if (session.isError) return <ErrorState reset={() => void session.refetch()} home="/login" standalone />;
  if (!session.data) return <Navigate to="/login" replace />;
  if (session.data.role === "member") return <Navigate to="/calendario" replace />;
  return (
    <StaffShell
      role={session.data.role === "admin" ? "admin" : "coach"}
      displayName={`${session.data.firstName} ${session.data.lastName}`.trim()}
      profileImageUrl={session.data.profileImageUrl}
      defaultOpen={sidebarOpen()}
    >
      <Outlet />
    </StaffShell>
  );
}

export function AdminGate() {
  const session = useSession();
  if (session.data?.role !== "admin") return <Navigate to="/staff/hoy" replace />;
  return <Outlet />;
}
