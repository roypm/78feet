import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

/** Recursos que cada mutación deja obsoletos. La clave de query empieza por ese nombre. */
export const invalidationScopes = {
  session: ["session"],
  booking: ["calendar", "instance", "bookings", "summary", "day", "week"],
  tariff: ["member", "members", "bookings", "summary", "history"],
  payment: ["payments", "unpaid", "summary", "member"],
  template: ["templates", "calendar", "day", "week", "instances", "bookings"],
  schedule: ["instances", "instance", "calendar", "day", "week", "exceptions"],
  roster: ["instance", "calendar", "day", "week", "bookings", "summary"],
  member: ["member", "members", "summary"],
  staff: ["staff"],
  catalog: ["boxes", "hours", "types", "tariffs", "coaches", "calendar", "day", "week", "templates", "instances"],
  training: ["trainings", "training"],
} as const;

export type InvalidationScope = keyof typeof invalidationScopes;

export function invalidateScope(scope: InvalidationScope) {
  return Promise.all(
    invalidationScopes[scope].map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    ),
  );
}
