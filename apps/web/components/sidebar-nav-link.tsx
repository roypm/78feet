"use client";

import { NavigationLink as Link } from "@/components/feedback/navigation-link";
import { useSidebarLiquid } from "@/components/navigation/sidebar-liquid-menu";
import type { LucideIcon } from "lucide-react";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { cn } from "cn";

export function SidebarNavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  const liquid = useSidebarLiquid();

  return (
    <SidebarMenuItem
      onMouseEnter={(event) => liquid?.moveTo(event.currentTarget)}
      onMouseMove={(event) => liquid?.onMove(event.currentTarget, event)}
    >
      <SidebarMenuButton
        isActive={active}
        aria-current={active ? "page" : undefined}
        tooltip={label}
        className={cn(
          "h-11 md:h-9 [&_svg]:size-5 group-data-[collapsible=icon]:[&_svg]:size-4 data-active:text-sidebar-primary",
          liquid?.enabled &&
            "bg-transparent pointer-hover:bg-transparent data-active:bg-transparent data-active:shadow-none",
        )}
        render={(props) => <Link {...props} href={href} />}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
