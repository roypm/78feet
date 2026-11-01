"use client";

import { NavigationLink as Link } from "@/components/feedback/navigation-link";
import type { LucideIcon } from "lucide-react";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

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
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        aria-current={active ? "page" : undefined}
        tooltip={label}
        className="h-11 md:h-9 [&_svg]:size-5 group-data-[collapsible=icon]:[&_svg]:size-4 data-active:text-sidebar-primary"
        render={(props) => <Link {...props} href={href} />}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
