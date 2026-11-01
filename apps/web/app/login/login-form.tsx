"use client";

import { PendingButton } from "@/components/feedback/pending-button";

import { useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { useTheme, type Theme } from "@/components/theme-provider";
import { Field } from "@/components/staff/field";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const { applyTheme } = useTheme();
  const { router, pending, begin, setPending } = useActionFeedback();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!begin()) return;
    const form = new FormData(event.currentTarget);
    const loginId = String(form.get("loginId") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ loginId, password }),
      });
      const payload = (await response.json()) as {
        error?: { message: string };
        user?: { role: string };
        theme?: Theme;
      };
      if (!response.ok) {
        setError(payload.error?.message ?? "No se pudo entrar");
        return;
      }
      applyTheme(payload.theme ?? "system");
      router.push(payload.user?.role === "member" ? "/calendario" : "/staff/hoy");
      router.refresh();
    } catch {
      setError("No se pudo entrar");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <fieldset disabled={pending} aria-busy={pending} className="contents">
        <Field label="Usuario o DNI" htmlFor="loginId">
          <Input
            id="loginId"
            name="loginId"
            autoComplete="username"
            required
            className="h-11 px-3"
          />
        </Field>
        <Field label="Contraseña" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-11 px-3"
          />
        </Field>
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
