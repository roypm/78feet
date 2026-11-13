import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@78feet/api-client";
import { apiClient, data } from "@/lib/api/browser";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        return data(await apiClient.GET("/api/v1/me/profile"));
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403))
          return null;
        throw error;
      }
    },
  });
}

export function useAccount() {
  return useSession().data ?? null;
}
