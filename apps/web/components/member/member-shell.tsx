"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, CreditCard, Footprints, History, Ticket, User } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const links = [
  { href: "/calendario", label: "Calendario", icon: Calendar },
  { href: "/reservas", label: "Reservas", icon: Ticket },
  { href: "/historial", label: "Historial", icon: History },
  { href: "/tarifa", label: "Tarifa", icon: CreditCard },
  { href: "/cuenta", label: "Cuenta", icon: User },
];

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/calendario") return pathname === href || pathname.startsWith("/clases");
  return pathname === href;
}

function MemberFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  return (
    <>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="78feet" render={<Link href="/calendario" />}>
                <Footprints />
                <span className="font-semibold">78feet</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {links.map((link) => (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton
                      isActive={isCurrent(pathname, link.href)}
                      tooltip={link.label}
                      render={<Link href={link.href} />}
                    >
                      <link.icon />
                      <span>{link.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-h-0 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]">{children}</div>
      </SidebarInset>
    </>
  );
}

export function MemberShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider className="h-svh overflow-hidden">
        <MemberFrame>{children}</MemberFrame>
      </SidebarProvider>
    </TooltipProvider>
  );
}
