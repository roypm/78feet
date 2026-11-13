import { Navigate } from "react-router";
import { useSession } from "@/lib/spa/session";

export function HomeRoute() {
  const session = useSession();
  if (session.isPending) return <main className="min-h-dvh bg-background" />;
  if (session.isError) return <Navigate to="/login" replace />;
  if (!session.data) return <Navigate to="/login" replace />;
  if (session.data.role === "member") return <Navigate to="/calendario" replace />;
  return <Navigate to="/staff/hoy" replace />;
}
