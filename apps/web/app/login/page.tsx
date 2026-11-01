import { redirect } from "next/navigation";
import { Footprints } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current";
import { LoginForm } from "./login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const instant = false;

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user?.role === "member") redirect("/calendario");
  if (user) redirect("/staff/hoy");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 sm:px-6">
      <Card className="w-full max-w-md gap-0 py-0">
        <CardHeader className="gap-0 border-b border-border px-6 py-6">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Footprints aria-hidden="true" className="size-6" />
            </span>
            <span className="text-xl font-semibold tracking-tight">78feet</span>
          </div>
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
