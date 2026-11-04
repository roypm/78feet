import { Fragment } from "react";
import { NavigationLink } from "@/components/feedback/navigation-link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export type Crumb = {
  label: string;
  href?: string;
};

export function StaffCrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;

  return (
    <Breadcrumb aria-label="Migas">
      <BreadcrumbList>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 ? <BreadcrumbSeparator>/</BreadcrumbSeparator> : null}
              <BreadcrumbItem className="min-w-0">
                {last || !item.href ? (
                  <BreadcrumbPage className="min-w-0 truncate text-muted-foreground">{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    className="text-primary pointer-hover:text-foreground"
                    render={<NavigationLink href={item.href} />}
                  >
                    {item.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
