"use client";

import Link from "next/link";
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
        tooltip={label}
        render={(props) => <Link {...props} href={href} />}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
