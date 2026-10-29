import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current";
import { LogoutButton } from "@/components/member/logout-button";

export default function Home() {
  return (
    <Suspense fallback={<main className="px-4 py-8 text-muted-foreground">Cargando…</main>}>
      <HomeScreen />
    </Suspense>
  );
}

async function HomeScreen() {
  const user = await getCurrentUser();
  if (user?.role === "member") redirect("/calendario");
  if (user) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-4 py-8">
        <h1 className="text-xl font-semibold">Hola, {user.firstName}</h1>
        <p className="text-muted-foreground">El panel de staff todavía no está.</p>
        <LogoutButton />
      </main>
    );
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8">
      <h1 className="text-2xl font-semibold">78feet</h1>
      <p className="mt-2">
        <Link href="/login" className="text-primary">
          Entrar
        </Link>
      </p>
    </main>
  );
}
