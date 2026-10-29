import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

export const controlClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base md:text-sm";
