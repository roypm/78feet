import type { ReactNode } from "react";
import { NavigationLink as Link } from "@/components/common/navigation/navigation-link";
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
  layout = "default",
  className,
}: {
  title: string;
  description?: ReactNode;
  href?: string;
  action?: string;
  children?: ReactNode;
  compact?: boolean;
  /** Listados staff: mismo ancho que la tabla; texto centrado con ancho cómodo. */
  layout?: "default" | "panel";
  className?: string;
}) {
  return (
    <Empty
      className={cn(
        "flex-none rounded-lg border border-border bg-card",
        compact
          ? "items-start gap-3 p-4 text-left"
          : layout === "panel"
            ? "min-h-[min(12rem,45vh)] w-full px-4 py-8 md:min-h-48 md:px-6 md:py-10"
            : "min-h-48 py-8",
        className,
      )}
    >
      <EmptyHeader
        className={cn(
          compact ? "max-w-none items-start" : layout === "panel" ? "w-full max-w-md" : undefined,
        )}
      >
        {!compact && (
          <EmptyMedia variant="icon" className="size-10" aria-hidden>
            <InboxIcon className="size-5" />
          </EmptyMedia>
        )}
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {(children || (href && action)) && (
        <EmptyContent
          className={cn(
            compact ? "max-w-none items-start" : layout === "panel" ? "w-full max-w-md" : undefined,
          )}
        >
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
