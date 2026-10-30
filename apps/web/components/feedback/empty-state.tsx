import type { ReactNode } from "react";
import { NavigationLink as Link } from "@/components/feedback/navigation-link";
import { InboxIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export function EmptyState({
  title,
  description,
  href,
  action,
  children,
  compact = false,
  className,
}: {
  title: string;
  description?: ReactNode;
  href?: string;
  action?: string;
  children?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Empty
      className={cn(
        "flex-none rounded-lg border border-border bg-card",
        compact ? "items-start gap-3 p-4 text-left" : "min-h-48 py-8",
        className,
      )}
    >
      <EmptyHeader className={compact ? "max-w-none items-start" : undefined}>
        {!compact && (
          <EmptyMedia variant="icon" className="size-10" aria-hidden>
            <InboxIcon className="size-5" />
          </EmptyMedia>
        )}
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {(children || (href && action)) && (
        <EmptyContent className={compact ? "max-w-none items-start" : undefined}>
          {href && action && (
            <Button nativeButton={false} variant="outline" className="min-h-11" render={<Link href={href} />}>
              {action}
            </Button>
          )}
          {children}
        </EmptyContent>
      )}
    </Empty>
  );
}
