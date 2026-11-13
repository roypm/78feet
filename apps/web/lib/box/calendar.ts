export type CalendarClass = {
  id: string;
  date: string;
  startAt: string;
  endAt: string;
  name: string;
  classTypeId: string;
  imageUrl: string | null;
  kind: "directed" | "open";
  status: "scheduled" | "cancelled";
  capacity: number;
  bookedCount: number;
  freeSpots: number;
  coachName: string | null;
  bookedByMe: boolean;
  isException: boolean;
};

export type TrainingDetail = {
  id: string;
  name: string;
  classTypeName: string;
  phases: {
    id: string;
    name: string;
    blocks: { id: string; body: string }[];
  }[];
};

export type InstanceDetail = CalendarClass & {
  boxName: string;
  coachProfileImageUrl: string | null;
  roster: { userId: string; name: string; profileImageUrl: string | null }[];
  bookingId: string | null;
  canBook: boolean;
  canCancel: boolean;
  training: TrainingDetail | null;
};
