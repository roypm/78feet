"use client";

import { PendingButton } from "@/components/feedback/pending-button";

import { useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";

export function LoginForm() {
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
      };
      if (!response.ok) {
        setError(payload.error?.message ?? "No se pudo entrar");
        return;
      }
      router.push(payload.user?.role === "member" ? "/calendario" : "/staff/hoy");
      router.refresh();
    } catch {
      setError("No se pudo entrar");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <fieldset disabled={pending} aria-busy={pending} className="contents">
          <label className="flex flex-col gap-1 text-sm">
            Usuario o DNI
            <input
              name="loginId"
              autoComplete="username"
              required
              className="rounded-md border border-input bg-card px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Contraseña
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-md border border-input bg-card px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </label>
          {error ? (
            <p className="text-sm text-[var(--color-error)]" role="alert">
              {error}
            </p>
          ) : null}
          <PendingButton type="submit" disabled={pending} className="min-h-11" pending={pending} pendingLabel={"Entrando…"}>
            {"Entrar"}
          </PendingButton>
        </fieldset>
      </form>
  );
}
