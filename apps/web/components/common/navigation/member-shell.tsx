import type { ReactNode } from "react";
import { BookOpen, Calendar, CreditCard, History, Ticket } from "lucide-react";
import { AppShell, type NavigationGroup } from "@/components/common/navigation/app-shell";

const groups: NavigationGroup[] = [
  { label: "Entrenamiento", links: [
    { href: "/calendario", label: "Calendario", icon: Calendar },
    { href: "/reservas", label: "Mis reservas", icon: Ticket },
    { href: "/biblioteca", label: "Biblioteca", icon: BookOpen },
  ] },
  { label: "Mi cuenta", links: [
    { href: "/historial", label: "Historial", icon: History },
    { href: "/tarifa", label: "Mi tarifa", icon: CreditCard },
  ] },
];

export function MemberShell(props: {
  children: ReactNode;
  displayName: string;
  profileImageUrl: string | null;
  defaultOpen: boolean;
}) {
  return <AppShell {...props} homeHref="/calendario" profileHref="/cuenta" roleLabel="Socio" groups={groups} />;
}
