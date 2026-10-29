import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user?.role === "member") redirect("/calendario");
  if (user) redirect("/staff/hoy");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">78feet</h1>
      <p className="mt-1 text-[var(--color-text-muted)]">Entrar al box</p>
      <LoginForm />
    </main>
  );
}
