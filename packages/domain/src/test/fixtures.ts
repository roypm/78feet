import { atBoxTime } from "../time";
import type { Booking, ClassInstance, ClassTemplate, CreditGrant } from "../types";

let seq = 0;

export function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

export function resetIds(): void {
  seq = 0;
}

function defaultTypeId(kind: ClassTemplate["kind"] | ClassInstance["kind"]): string {
  return kind === "open" ? "type-open" : "type-wod";
}

export function makeTemplate(
  overrides: Partial<ClassTemplate> &
    Pick<ClassTemplate, "weekday" | "startTime" | "endTime"> & {
      kind: ClassTemplate["kind"];
      title?: string;
    },
): ClassTemplate {
  const { title: _title, ...rest } = overrides;
  void _title;
  return {
    id: nextId("tpl"),
    coachId: "coach-1",
    defaultCapacity: 12,
    active: true,
    classTypeId: defaultTypeId(overrides.kind),
    ...rest,
  };
}

export function makeInstance(
  overrides: Partial<ClassInstance> &
    Pick<ClassInstance, "date" | "kind"> & {
      title?: string;
    },
): ClassInstance {
  const startTime = "18:00";
  const endTime = "19:00";
  const { title: _title, ...rest } = overrides;
  void _title;
  return {
    id: nextId("inst"),
    templateId: "tpl-1",
    startAt: atBoxTime(overrides.date, startTime),
    endAt: atBoxTime(overrides.date, endTime),
    coachId: "coach-1",
    capacity: 12,
    status: "scheduled",
    editedAt: null,
    classTypeId: defaultTypeId(overrides.kind),
    trainingId: null,
    trainingClassTypeId: null,
    ...rest,
  };
}

export function makeBooking(
  overrides: Partial<Booking> & Pick<Booking, "instanceId" | "userId" | "pool">,
): Booking {
  return {
    id: nextId("bk"),
    status: "active",
    quotaReturned: null,
    createdBy: overrides.userId,
    cancelledAt: null,
    cancelledBy: null,
    ...overrides,
  };
}

export function makeGrant(
  overrides: Partial<CreditGrant> & Pick<CreditGrant, "userId" | "quantity">,
): CreditGrant {
  return {
    id: nextId("cg"),
    ...overrides,
  };
}

export function instanceMap(instances: ClassInstance[]): Map<string, ClassInstance> {
  return new Map(instances.map((instance) => [instance.id, instance]));
}
