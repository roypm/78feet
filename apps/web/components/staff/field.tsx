import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

export function Field({ label, htmlFor, invalid, disabled, children }: {
  label: string;
  htmlFor?: string;
  invalid?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div data-invalid={invalid || undefined} data-disabled={disabled || undefined} className="group flex min-w-0 flex-col gap-1">
      <Label htmlFor={htmlFor} className="text-sm group-data-[invalid=true]:text-destructive">{label}</Label>
      {children}
    </div>
  );
}
