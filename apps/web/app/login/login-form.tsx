import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginBody } from "@78feet/contracts";
import { createApiClient } from "@78feet/api-client";
import { PendingButton } from "@/components/common/feedback/pending-button";
import { FormInput } from "@/components/common/forms/form-control";
import { FormSelect } from "@/components/common/forms/form-select";
import { useTheme } from "@/components/providers/theme-provider";
import { clearAccountCache, useRouter } from "@/lib/spa/router";

export function LoginForm({ initialLoginId = "" }: { initialLoginId?: string }) {
  const { applyTheme } = useTheme();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(loginBody),
    defaultValues: { access: "member" as const, loginId: initialLoginId, password: "" },
  });

  async function onSubmit(values: { access: "member" | "staff"; loginId: string; password: string }) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const { data: payload } = await createApiClient().POST("/api/v1/auth/login", { body: values });
      if (!payload) throw new Error("No se pudo entrar");
      clearAccountCache();
      applyTheme(payload.theme ?? "system");
      void router.push(payload.user?.role === "member" ? "/calendario" : "/staff/hoy");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo entrar");
      setPending(false);
    }
  }

  const access = form.watch("access");
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <fieldset disabled={pending} aria-busy={pending} className="contents">
        <FormSelect
          label="Acceso"
          name="access"
          required
          options={[
            { value: "member", label: "Socio" },
            { value: "staff", label: "Equipo" },
          ]}
          value={access}
          onValueChange={(value) => form.setValue("access", value === "staff" ? "staff" : "member", { shouldValidate: true })}
          error={form.formState.errors.access?.message}
        />
        <FormInput
          label="Usuario o DNI"
          id="loginId"
          autoComplete="username"
          maxLength={256}
          className="h-11 px-3"
          error={form.formState.errors.loginId?.message}
          {...form.register("loginId")}
        />
        <FormInput
          label="Contraseña"
          id="password"
          type="password"
          autoComplete="current-password"
          className="h-11 px-3"
          error={form.formState.errors.password?.message}
          {...form.register("password")}
        />
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <PendingButton type="submit" disabled={pending} className="mt-1 min-h-11 w-full text-base" pending={pending} pendingLabel="Entrando…">
          Entrar
        </PendingButton>
      </fieldset>
    </form>
  );
}
