"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calendar,
  CalendarClock,
  CalendarDays,
  CircleUser,
  Clock,
  CreditCard,
  Footprints,
  LayoutTemplate,
  Tag,
  Users,
  Wallet,
} from "lucide-react";
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
import { SidebarNavLink } from "@/components/sidebar-nav-link";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LogoutButton } from "@/components/member/logout-button";

const links = [
  { href: "/staff/hoy", label: "Hoy", icon: CalendarDays },
  { href: "/staff/semana", label: "Semana", icon: Calendar },
  { href: "/staff/plantilla", label: "Plantilla", icon: LayoutTemplate, admin: true },
  { href: "/staff/tipos", label: "Tipos de clase", icon: Tag, admin: true },
  { href: "/staff/excepciones", label: "Excepciones", icon: CalendarClock },
  { href: "/staff/socios", label: "Socios", icon: Users },
  { href: "/staff/tarifas", label: "Tarifas", icon: CreditCard, admin: true },
  { href: "/staff/impagos", label: "Impagos", icon: Wallet },
  { href: "/staff/horario", label: "Horario", icon: Clock, admin: true },
  { href: "/staff/biblioteca", label: "Biblioteca", icon: BookOpen },
  { href: "/staff/equipo", label: "Equipo", icon: CircleUser, admin: true },
];

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/staff/hoy") return pathname === href;
  if (href === "/staff/socios") return pathname.startsWith("/staff/socios");
  if (href === "/staff/biblioteca") return pathname.startsWith("/staff/biblioteca");
  if (href === "/staff/excepciones") return pathname.startsWith("/staff/excepciones") || pathname.startsWith("/staff/clases");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function StaffFrame({
  role,
  children,
}: {
  role: "coach" | "admin";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  const visible = links.filter((link) => !link.admin || role === "admin");

  return (
    <>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="78feet"
                render={(props) => <Link {...props} href="/staff/hoy" />}
              >
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
                {visible.map((link) => (
                  <SidebarNavLink
                    key={link.href}
                    href={link.href}
                    label={link.label}
                    icon={link.icon}
                    active={isCurrent(pathname, link.href)}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <div className="mt-auto p-2">
            <LogoutButton />
          </div>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-h-0 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]">{children}</div>
      </SidebarInset>
    </>
  );
}

export function StaffShell({
  role,
  children,
}: {
  role: "coach" | "admin";
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider className="h-svh overflow-hidden">
        <StaffFrame role={role}>{children}</StaffFrame>
      </SidebarProvider>
    </TooltipProvider>
  );
}
