"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { NavigationLink as Link } from "@/components/feedback/navigation-link";
import { brandHomeLabel, BrandMark } from "@/components/navigation/brand-mark";
import { LogoutButton } from "@/components/member/logout-button";
import { ProfileAvatar } from "@/components/member/profile-avatar";
import { SidebarNavLink } from "@/components/sidebar-nav-link";
import { SidebarLiquidNav } from "@/components/navigation/sidebar-liquid-menu";
import { useTheme } from "@/components/theme-provider";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isNavigationActive, staffActivityPaths } from "@/lib/navigation";

export type NavigationGroup = {
  label: string;
  links: { href: string; label: string; icon: LucideIcon; admin?: boolean }[];
};

type AppShellProps = {
  displayName: string;
  profileImageUrl: string | null;
  defaultOpen: boolean;
  homeHref: string;
  profileHref: string;
  roleLabel: string;
  groups: NavigationGroup[];
  children: ReactNode;
};

function ThemeButton() {
  const { resolvedTheme, pending, saveTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const Icon = dark ? Moon : Sun;
  const label = dark ? "Usar tema claro" : "Usar tema oscuro";
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        type="button"
        role="switch"
        aria-label="Modo oscuro"
        aria-checked={dark}
        aria-busy={pending}
        disabled={pending}
        tooltip={label}
        className="h-11 [&_svg]:size-5 group-data-[collapsible=icon]:[&_svg]:size-4"
        onClick={() => {
          void saveTheme(dark ? "light" : "dark").catch(() => toast.error("No se pudo guardar el tema. Probá de nuevo."));
        }}
      >
        <Icon aria-hidden="true" />
        <span>Tema {dark ? "oscuro" : "claro"}</span>
        <span className="ml-auto text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          {pending ? "Guardando…" : "Cambiar"}
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function AppFrame({ displayName, profileImageUrl, homeHref, profileHref, roleLabel, groups, children }: AppShellProps) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const [classOrigin, setClassOrigin] = useState("/staff/semana");
  // Keep the activity section selected when opening a class from that view.
  if (staffActivityPaths.includes(pathname) && classOrigin !== pathname) setClassOrigin(pathname);

  useEffect(() => { setOpenMobile(false); }, [pathname, setOpenMobile]);

  return (
    <>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="gap-3 px-2 pt-3 pb-2">
          <div className="flex min-h-10 items-center justify-between gap-2 px-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:px-0">
            <Link href={homeHref} aria-label={brandHomeLabel} className="flex min-w-0 items-center gap-2.5 rounded-md py-1">
              <BrandMark variant="sidebar-icon" className="hidden group-data-[collapsible=icon]:block" />
              <BrandMark variant="sidebar" className="group-data-[collapsible=icon]:hidden" />
            </Link>
            <SidebarTrigger className="size-9 shrink-0" />
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                isActive={pathname === profileHref}
                tooltip={`${displayName || "Mi perfil"} · Mi perfil`}
                aria-current={pathname === profileHref ? "page" : undefined}
                className="h-16 gap-3 px-2"
                render={(props) => <Link {...props} href={profileHref} />}
              >
                <ProfileAvatar name={displayName} imageUrl={profileImageUrl} className="group-data-[collapsible=icon]:size-8" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">{displayName || "Mi perfil"}</span>
                  <span className="truncate text-xs text-muted-foreground">Mi perfil · {roleLabel}</span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <Separator />
        </SidebarHeader>
        <SidebarContent className="gap-2">
          <SidebarLiquidNav>
            <nav aria-label="Navegación principal" className="flex flex-col gap-2">
              {groups.filter((group) => group.links.length > 0).map((group) => (
                <SidebarGroup key={group.label} className="py-1">
                  <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-1">
                      {group.links.map((link) => (
                        <SidebarNavLink key={link.href} {...link} active={isNavigationActive(pathname, link.href, classOrigin)} />
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </nav>
          </SidebarLiquidNav>
        </SidebarContent>
        <SidebarFooter className="gap-2 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Separator />
          <SidebarMenu><ThemeButton /></SidebarMenu>
          <LogoutButton />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]">{children}</div>
      </SidebarInset>
    </>
  );
}

export function AppShell(props: AppShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={props.defaultOpen} className="h-dvh overflow-hidden">
        <AppFrame {...props} />
      </SidebarProvider>
    </TooltipProvider>
  );
}
