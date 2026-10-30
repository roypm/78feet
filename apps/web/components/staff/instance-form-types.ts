export type ClassType = { id: string; name: string; kind: "directed" | "open" };
export type Training = { id: string; name: string; classTypeId: string };
export type Coach = { id: string; name: string };

export type EditableInstance = {
  id: string;
  date: string;
  startAt: string;
  endAt: string;
  classTypeId: string;
  coachId: string | null;
  capacity: number;
  status: "scheduled" | "cancelled";
  trainingId: string | null;
  bookedCount: number;
};
