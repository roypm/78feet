"use client";

import NextLink, { useLinkStatus } from "next/link";
import { forwardRef, type ComponentProps } from "react";

function NavigationHint() {
  const { pending } = useLinkStatus();
  return (
    <>
      <i
        aria-hidden="true"
        data-slot="navigation-hint"
        data-pending={pending || undefined}
        className="navigation-hint"
      />
      <output className="sr-only">{pending ? "Cargando la página…" : ""}</output>
    </>
  );
}

/** Retains native Link behavior, including prefetch, new tabs and interrupted navigation. */
export const NavigationLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof NextLink>>(function NavigationLink(
  { children, className, ...props },
  ref,
) {
  return (
    <NextLink {...props} ref={ref} className={className ? `${className} navigation-link` : "navigation-link"}>
      {children}
      <NavigationHint />
    </NextLink>
  );
});
