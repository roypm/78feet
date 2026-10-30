import type { ScheduleTemplate } from "@/lib/box/template-draft";

export type TemplateKind = "directed" | "open";

export const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const SHORT_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export type ClassType = { id: string; name: string; kind: "directed" | "open"; imageUrl: string };
export type Coach = { id: string; name: string };
export type Draft = {
  key: number;
  kind: TemplateKind;
  template?: ScheduleTemplate;
  weekday: number;
  startTime: string;
  endTime: string;
  classTypeId: string;
  coachId: string | null;
  defaultCapacity: number;
};
