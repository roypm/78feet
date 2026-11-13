import type { BookingPool } from "@78feet/domain";

export type BookingView = {
  id: string;
  instanceId: string;
  userId: string;
  pool: BookingPool;
  status: "active" | "cancelled";
  quotaReturned: boolean | null;
  createdBy: string;
  createdAt: string;
  cancelledAt: string | null;
  cancelledBy: string | null;
  instance: {
    id: string;
    date: string;
    name: string;
    boxName: string;
    kind: "directed" | "open";
    startAt: string;
    endAt: string;
    capacity: number;
    status: "scheduled" | "cancelled";
  };
};

export type MemberBookingView = BookingView & {
  canCancel: boolean;
  boxCancelled: boolean;
};

export type HistoryBookingView = MemberBookingView & {
  coachName: string | null;
  coachProfileImageUrl: string | null;
};
