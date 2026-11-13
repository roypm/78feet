import { forwardRef, type ComponentProps } from "react";
import { Link, useNavigation } from "react-router";

type Props = Omit<ComponentProps<typeof Link>, "to" | "prefetch"> & { href: string };

function pendingTarget(href: string, location: { pathname: string; search: string } | null | undefined) {
  if (!location) return false;
  const url = new URL(href, "http://local");
  return url.pathname === location.pathname && url.search === location.search;
}

export const NavigationLink = forwardRef<HTMLAnchorElement, Props>(function NavigationLink(
  { href, children, className, ...props },
  ref,
) {
  const navigation = useNavigation();
  const pending = navigation.state === "loading" && pendingTarget(href, navigation.location);
  return (
    <Link {...props} ref={ref} to={href} className={className ? `${className} navigation-link` : "navigation-link"}>
      {children}
      <i aria-hidden="true" data-slot="navigation-hint" data-pending={pending || undefined} className="navigation-hint" />
      <output className="sr-only">{pending ? "Cargando la página…" : ""}</output>
    </Link>
  );
});
