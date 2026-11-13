export type TemplateView = {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  classTypeId: string;
  kind: "directed" | "open";
  classTypeName: string;
  imageUrl: string | null;
  coachId: string | null;
  defaultCapacity: number;
  active: boolean;
};
