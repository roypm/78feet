import type { ReactNode } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { ApiError } from "@78feet/api-client";
import { ErrorState } from "@/components/common/feedback/error-state";
import MemberNotFound from "@/app/(member)/not-found";
import StaffNotFound from "@/app/staff/not-found";
import { useAccount } from "@/lib/spa/session";

type Account = NonNullable<ReturnType<typeof useAccount>>;

export function useAccountQuery<T>(key: readonly unknown[], queryFn: (account: Account) => Promise<T>) {
  const account = useAccount();
  const query = useQuery({
    queryKey: account ? [key[0], account.id, ...key.slice(1)] : ["blocked", ...key],
    enabled: account !== null,
    queryFn: () => {
      if (!account) throw new Error("La sesión no está disponible");
      return queryFn(account);
    },
  });
  return { account, query };
}

export function QueryBody<T>({
  query,
  accountReady,
  pending,
  home,
  missing = "root",
  children,
}: {
  query: UseQueryResult<T>;
  accountReady: boolean;
  pending: ReactNode;
  home: string;
  missing?: "member" | "staff" | "root";
  children: (data: T) => ReactNode;
}) {
  if (!accountReady || query.isPending) return pending;
  if (query.error instanceof ApiError && query.error.status === 404) {
    if (missing === "member") return <MemberNotFound />;
    if (missing === "staff") return <StaffNotFound />;
    return <ErrorState reset={() => void query.refetch()} home={home} />;
  }
  if (query.isError || query.data === undefined)
    return <ErrorState reset={() => void query.refetch()} home={home} />;
  return children(query.data);
}
