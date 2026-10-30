"use client";

import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/** Both labels occupy the same grid cell, keeping the button width stable. */
export function PendingButton({
  pending,
  pendingLabel,
  children,
  disabled,
  ...props
}: ComponentProps<typeof Button> & {
  pending: boolean;
  pendingLabel: ReactNode;
}) {
  return (
    <Button {...props} disabled={disabled || pending} aria-busy={pending}>
      <span className="grid">
        <span aria-hidden={pending} className={`col-start-1 row-start-1 ${pending ? "invisible" : ""}`}>
          {children}
        </span>
        <span
          aria-hidden={!pending}
          className={`col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5 ${pending ? "" : "invisible"}`}
        >
          <Spinner aria-hidden="true" data-icon="inline-start" />
          {pendingLabel}
        </span>
      </span>
    </Button>
  );
}
