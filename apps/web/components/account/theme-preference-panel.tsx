"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { useTheme } from "@/components/providers/theme-provider";

function ThemePreview({ theme }: { theme: "system" | "light" | "dark" }) {
  const panes = theme === "system" ? (["light", "dark"] as const) : [theme];
  return (
    <span aria-hidden="true" className="flex h-16 overflow-hidden rounded-md border border-border">
      {panes.map((pane) => (
        <span
          key={pane}
          data-theme={pane}
          className={cn("flex min-w-0 flex-1 gap-1 bg-background p-1.5", panes.length === 2 && "border-r border-border last:border-r-0")}
        >
          <span className="w-1/4 rounded-sm bg-sidebar" />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="h-3 rounded-sm bg-header" />
            <span className="flex min-h-0 flex-1 gap-1">
              <span className="w-1/2 rounded-sm bg-card ring-1 ring-border" />
              <span className="flex-1 rounded-sm bg-muted" />
            </span>
          </span>
        </span>
      ))}
    </span>
  );
}

export function ThemePreferencePanel() {
  const { theme, pending, saveTheme } = useTheme();
  return (
    <section className="rounded-lg bg-card p-4 ring-1 ring-foreground/10 md:p-6">
      <h2 className="mb-3 font-medium">Apariencia</h2>
      <fieldset disabled={pending} aria-busy={pending} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <legend className="sr-only">Tema de la aplicación</legend>
        {([
          { value: "system", label: "Sistema", Icon: Monitor },
          { value: "light", label: "Claro", Icon: Sun },
          { value: "dark", label: "Oscuro", Icon: Moon },
        ] as const).map(({ value, label, Icon }) => {
          const selected = theme === value;
          return (
            <label key={value} className="min-w-0 cursor-pointer">
              <input
                type="radio"
                name="appearance-theme"
                value={value}
                checked={selected}
                onChange={() => {
                  if (selected) return;
                  void saveTheme(value).catch(() => toast.error("No se pudo guardar el tema. Probá de nuevo."));
                }}
                className="peer sr-only"
              />
              <span className="block rounded-lg border border-border p-2 transition-colors peer-checked:border-primary peer-checked:bg-primary/5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                <ThemePreview theme={value} />
                <span className="mt-2 flex min-h-8 items-center gap-2">
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                  <span className="font-medium">{label}</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "ml-auto flex size-5 shrink-0 items-center justify-center rounded-full",
                      selected ? "bg-primary text-primary-foreground" : "border border-border bg-background text-transparent",
                    )}
                  >
                    {selected ? <Check className="size-3.5" /> : null}
                  </span>
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>
    </section>
  );
}
