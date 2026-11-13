import { useSearchParams } from "react-router";
import { LoginForm } from "@/app/login/login-form";
import { NavigationLink } from "@/components/common/navigation/navigation-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccessFixture() {
  if (process.env.NODE_ENV === "production") throw new Error("NOT_FOUND");
  const [params] = useSearchParams();
  const worst = params.get("data") === "worst";
  const loginId = worst ? "maria-del-carmen.rodriguez-fernandez-entrenamiento-funcional" : "12345678Z";
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Acceso · datos de prueba</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm key={loginId} initialLoginId={loginId} />
        </CardContent>
      </Card>
      <nav aria-label="Datos de prueba" className="flex justify-center gap-4 text-sm">
        <NavigationLink href="?data=demo">Demo data</NavigationLink>
        <NavigationLink href="?data=worst">Worst case</NavigationLink>
      </nav>
    </main>
  );
}
