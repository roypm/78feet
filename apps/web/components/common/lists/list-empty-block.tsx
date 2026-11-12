import type { ReactNode } from "react";
import { NavigationLink } from "@/components/common/navigation/navigation-link";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

/** A single replacement for list results: controls stay outside this block. */
export function ListEmptyBlock({
  title,
  description,
  href,
  action,
  children,
}: {
  title: string;
  description?: ReactNode;
  href?: string;
  action?: string;
  children?: ReactNode;
}) {
  return (
    <Empty className="min-h-36 flex-none gap-3 rounded-lg border border-solid border-border bg-card px-4 py-6 md:px-6">
      <EmptyHeader className="w-full max-w-lg">
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {children || (href && action) ? (
        <EmptyContent className="max-w-lg">
          {href && action ? (
            <Button nativeButton={false} variant="outline" className="min-h-11" render={<NavigationLink href={href} />}>
              {action}
            </Button>
          ) : null}
          {children}
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
