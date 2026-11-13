import { ApiError, createApiClient } from "@78feet/api-client";

export { ApiError };

export const apiClient = createApiClient();

export function data<T>(response: { data?: T }): T {
  if (response.data === undefined) throw new Error("La API no devolvió datos");
  return response.data;
}
