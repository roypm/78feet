import { StrictMode, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Outlet, RouterProvider } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@78feet/api-client";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider, useTheme, type Theme } from "@/components/providers/theme-provider";
import { queryClient } from "@/lib/spa/query";
import { useSession } from "@/lib/spa/session";
import { createAppRouter } from "@/src/router";
import "@/app/globals.css";

function storedTheme(): Theme {
  const match = document.cookie.match(/(?:^|; )theme=(system|light|dark)(?:;|$)/);
  if (match?.[1] === "light" || match?.[1] === "dark" || match?.[1] === "system") return match[1];
  return "system";
}

function Root() {
  const session = useSession();
  const { applyTheme } = useTheme();
  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (!session.data) return;
    const token = `${session.data.id}:${session.data.theme}`;
    if (seen.current === token) return;
    seen.current = token;
    applyTheme(session.data.theme);
  }, [applyTheme, session.data]);
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}

const router = createAppRouter(Root);

queryClient.getQueryCache().subscribe((event) => {
  if (event.type !== "updated" || event.query.queryKey[0] === "session") return;
  const error = event.query.state.error;
  if (error instanceof ApiError && error.status === 401) {
    queryClient.clear();
    void router.navigate("/login");
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider initialTheme={storedTheme()}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
