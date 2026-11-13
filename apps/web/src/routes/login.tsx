import { Navigate } from "react-router";
import { BrandMark } from "@/components/common/navigation/brand-mark";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { useSession } from "@/lib/spa/session";
import { LoginForm } from "@/app/login/login-form";

export function LoginRoute() {
  const session = useSession();
  if (session.isPending) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4">
        <LoadingState variant="profile" label="Comprobando la sesión…" />
      </main>
    );
  }
  if (session.data?.role === "member") return <Navigate to="/calendario" replace />;
  if (session.data) return <Navigate to="/staff/hoy" replace />;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 sm:px-6">
      <Card className="w-full max-w-md gap-0 py-0">
        <CardHeader className="gap-0 border-b border-border px-6 py-6">
          <BrandMark variant="login" />
          <div className="mt-6 grid gap-1">
            <CardTitle role="heading" aria-level={1} className="text-2xl font-semibold tracking-tight">
              Entrar al box
            </CardTitle>
            <CardDescription>Acceso para socios y equipo.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
