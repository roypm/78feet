import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

export function Field({
  label,
  htmlFor,
  invalid,
  disabled,
  error,
  errorId,
  children,
}: {
  label: string;
  htmlFor?: string;
  invalid?: boolean;
  disabled?: boolean;
  error?: string;
  errorId?: string;
  children: ReactNode;
}) {
  const isInvalid = Boolean(invalid || error);
  return (
    <div data-invalid={isInvalid || undefined} data-disabled={disabled || undefined} className="group relative flex min-w-0 flex-col gap-1">
      <Label htmlFor={htmlFor} className="text-sm group-data-[invalid=true]:text-destructive">{label}</Label>
      {children}
      {error ? <p id={errorId} className="text-sm text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}
