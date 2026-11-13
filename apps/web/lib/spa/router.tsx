import { useLocation, useNavigate } from "react-router";
import {
  invalidateScope,
  queryClient,
  type InvalidationScope,
} from "@/lib/spa/query";

export function usePathname() {
  return useLocation().pathname;
}

export function useRouter() {
  const navigate = useNavigate();
  return {
    push(href: string, options?: { scroll?: boolean }) {
      return navigate(href, { preventScrollReset: options?.scroll === false });
    },
    replace(href: string) {
      return navigate(href, { replace: true });
    },
    refresh(scope: InvalidationScope | "all" = "all") {
      if (scope === "all") return queryClient.invalidateQueries();
      return invalidateScope(scope);
    },
    back() {
      return navigate(-1);
    },
  };
}

export function clearAccountCache() {
  queryClient.clear();
}
