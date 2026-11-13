import { ApiError } from "@78feet/api-client";
import { apiClient, data } from "../api/browser";

export async function getCurrentUser() {
  try {
    return data(await apiClient.GET("/api/v1/me/profile"));
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403))
      return null;
    throw error;
  }
}
export const listBoxes = async () =>
  data(await apiClient.GET("/api/v1/boxes"));
export const listClassTypes = async () =>
  data(await apiClient.GET("/api/v1/admin/class-types"));
export const listTariffs = async () =>
  data(await apiClient.GET("/api/v1/admin/tariffs"));
export const listCoaches = async () =>
  data(await apiClient.GET("/api/v1/admin/coaches"));
export const listStaff = async (
  filters: {
    role?: "coach" | "admin";
    status?: "active" | "inactive";
    order?: string;
  } = {},
) =>
  data(
    await (
      apiClient
    ).GET("/api/v1/admin/staff", { params: { query: filters } }),
  );
export const getStaff = async (id: string) =>
  data(
    await (
      apiClient
    ).GET("/api/v1/admin/staff/{id}", { params: { path: { id } } }),
  );
export const getMember = async (id: string) =>
  data(
    await (
      apiClient
    ).GET("/api/v1/admin/members/{id}", { params: { path: { id } } }),
  );
export const listMemberOptions = async () =>
  data(await apiClient.GET("/api/v1/admin/members/options"));
export const listMembersPage = async (
  status: "active" | "inactive" | "all",
  page = 1,
  order?: string,
) =>
  data(
    await (
      apiClient
    ).GET("/api/v1/admin/members", {
      params: { query: { status, page, order } },
    }),
  );
export const getOwnProfile = async () => getCurrentUser();
export const getOwnProfileImageUrl = async () =>
  (await getCurrentUser())?.profileImageUrl ?? null;
export const getMemberSummary = async (
  id: string,
  role: "member" | "coach" | "admin",
) =>
  role === "member"
    ? data(await apiClient.GET("/api/v1/me/summary"))
    : data(
        await apiClient.GET("/api/v1/admin/members/{id}/summary", {
          params: { path: { id } },
        }),
      );
export const getBoxHours = async (boxId?: string) => {
  const id = boxId ?? (await listBoxes())[0]?.id;
  return data(
    await (
      apiClient
    ).GET("/api/v1/boxes/{id}/hours", { params: { path: { id } } }),
  );
};
export const listCalendar = async (from: string, to: string, box?: string) =>
  data(
    await (
      apiClient
    ).GET("/api/v1/calendar", { params: { query: { from, to, box } } }),
  );
export const getInstanceDetail = async (id: string) =>
  data(
    await (
      apiClient
    ).GET("/api/v1/instances/{id}", { params: { path: { id } } }),
  );
export const getStaffInstance = async (id: string) =>
  data(
    await (
      apiClient
    ).GET("/api/v1/admin/instances/{id}", { params: { path: { id } } }),
  );
export const listDay = async (date: string, box?: string) =>
  data(
    await (
      apiClient
    ).GET("/api/v1/admin/day", { params: { query: { date, box } } }),
  );
export const listWeek = async (from: string, box?: string) =>
  data(
    await (
      apiClient
    ).GET("/api/v1/admin/week", { params: { query: { from, box } } }),
  );
export const listTemplates = async (box?: string) =>
  data(
    await (
      apiClient
    ).GET("/api/v1/admin/templates", { params: { query: { box } } }),
  );
export const listExceptionsPage = async (from: string, page = 1) =>
  data(
    await (
      apiClient
    ).GET("/api/v1/admin/instances", { params: { query: { from, page } } }),
  );
export const listUpcomingBookingsPage = async (page = 1) =>
  data(
    await (
      apiClient
    ).GET("/api/v1/me/bookings", { params: { query: { page } } }),
  );
export const listBookingHistoryPage = async (page = 1) =>
  data(
    await (
      apiClient
    ).GET("/api/v1/me/bookings/history", { params: { query: { page } } }),
  );
export const listMemberPayments = async (id: string, page = 1) =>
  data(
    await (
      apiClient
    ).GET("/api/v1/admin/members/{id}/payments", {
      params: { path: { id }, query: { page } },
    }),
  );
export const listRegisteredPaymentsPage = async (
  box?: string,
  page = 1,
  order?: string,
) =>
  data(
    await (
      apiClient
    ).GET("/api/v1/admin/payments", {
      params: { query: { box, page, order } },
    }),
  );
export const listUnpaidPage = async (
  date?: string,
  page = 1,
  box?: string,
  order?: string,
) =>
  data(
    await (
      apiClient
    ).GET("/api/v1/admin/unpaid", {
      params: { query: { date, page, box, order } },
    }),
  );
export const listTrainings = async (type?: string) =>
  data(
    await (
      apiClient
    ).GET("/api/v1/admin/trainings/options", { params: { query: { type } } }),
  );
export const listTrainingsPage = async (
  type?: string,
  page = 1,
  order?: string,
) =>
  data(
    await (
      apiClient
    ).GET("/api/v1/trainings", { params: { query: { type, page, order } } }),
  );
export const listStaffTrainingsPage = async (
  type?: string,
  page = 1,
  order?: string,
) =>
  data(
    await (
      apiClient
    ).GET("/api/v1/admin/trainings", {
      params: { query: { type, page, order } },
    }),
  );
export const listTrainingFilterTypes = async () =>
  data(await apiClient.GET("/api/v1/trainings/filter-types"));
export const getTraining = async (id: string) =>
  data(
    await (
      apiClient
    ).GET("/api/v1/trainings/{id}", { params: { path: { id } } }),
  );
export type HistoryBookingView = Awaited<
  ReturnType<typeof listBookingHistoryPage>
>["items"][number];
