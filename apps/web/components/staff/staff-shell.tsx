"use client";

import type { ReactNode } from "react";
import { BookOpen, Calendar, CalendarClock, CalendarDays, CircleUser, Clock, CreditCard, LayoutTemplate, Tag, Users, Wallet } from "lucide-react";
import { AppShell, type NavigationGroup } from "@/components/navigation/app-shell";

const groups: NavigationGroup[] = [
  { label: "Actividad", links: [
    { href: "/staff/hoy", label: "Hoy", icon: CalendarDays },
    { href: "/staff/semana", label: "Semana", icon: Calendar },
    { href: "/staff/excepciones", label: "Excepciones", icon: CalendarClock },
    { href: "/staff/biblioteca", label: "Biblioteca", icon: BookOpen },
  ] },
  { label: "Gestión", links: [
    { href: "/staff/socios", label: "Socios", icon: Users },
    { href: "/staff/impagos", label: "Impagos", icon: Wallet },
    { href: "/staff/equipo", label: "Equipo", icon: CircleUser, admin: true },
  ] },
  { label: "Configuración del box", links: [
    { href: "/staff/plantilla", label: "Plantilla", icon: LayoutTemplate, admin: true },
    { href: "/staff/tipos", label: "Tipos de clase", icon: Tag, admin: true },
    { href: "/staff/horario", label: "Horario del box", icon: Clock, admin: true },
    { href: "/staff/tarifas", label: "Tarifas", icon: CreditCard, admin: true },
  ] },
];

export function StaffShell({ role, ...props }: {
  role: "coach" | "admin";
  children: ReactNode;
  displayName: string;
  profileImageUrl: string | null;
  defaultOpen: boolean;
}) {
  const visibleGroups = groups.map((group) => ({
    ...group,
    links: group.links.filter((link) => !link.admin || role === "admin"),
  }));
  return <AppShell {...props} homeHref="/staff/hoy" profileHref="/staff/perfil" roleLabel={role === "admin" ? "Admin" : "Coach"} groups={visibleGroups} />;
}
