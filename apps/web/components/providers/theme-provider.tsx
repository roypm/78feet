import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { api } from "@/lib/box/api";
import { invalidateScope } from "@/lib/spa/query";

export type Theme = "system" | "light" | "dark";
export type ResolvedTheme = Exclude<Theme, "system">;

type ThemeState = {
  initialTheme: Theme;
  theme: Theme;
};

const ThemeContext = createContext<{
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  pending: boolean;
  applyTheme: (theme: Theme) => void;
  saveTheme: (theme: Theme) => Promise<void>;
} | null>(null);

function subscribeToSystemTheme(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSystemThemeSnapshot(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getSystemThemeServerSnapshot(): ResolvedTheme {
  return "light";
}

export function ThemeProvider({ initialTheme, children }: { initialTheme: Theme; children: ReactNode }) {
  const [state, setState] = useState<ThemeState>(() => ({
    initialTheme,
    theme: initialTheme,
  }));
  if (state.initialTheme !== initialTheme) {
    setState({ initialTheme, theme: initialTheme });
  }
  const { theme } = state;
  const systemTheme = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemThemeSnapshot,
    getSystemThemeServerSnapshot,
  );
  const resolvedTheme = theme === "system" ? systemTheme : theme;
  const [pending, setPending] = useState(false);
  const saving = useRef(false);

  const applyTheme = useCallback((next: Theme) => {
    document.cookie = `theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
    setState((current) => ({ ...current, theme: next }));
  }, []);

  useLayoutEffect(() => {
    // During hydration useSyncExternalStore starts from its server snapshot.
    // Resolve System directly here so the first browser paint already matches
    // the operating system, without waiting for the store to resynchronize.
    const activeTheme = theme === "system" ? getSystemThemeSnapshot() : theme;
    document.documentElement.dataset.theme = activeTheme;
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
      meta.content = activeTheme === "dark" ? "#2c3e54" : "#ffffff";
    });
  }, [theme, resolvedTheme]);

  async function saveTheme(next: Theme) {
    if (saving.current) return;
    const previous = theme;
    saving.current = true;
    setPending(true);
    applyTheme(next);
    try {
      const result = await api<{ theme: Theme }>("/api/v1/me/preferences", {
        method: "PATCH",
        body: JSON.stringify({ theme: next }),
      });
      applyTheme(result.theme);
      void invalidateScope("session");
    } catch (error) {
      applyTheme(previous);
      throw error;
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, pending, applyTheme, saveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme requiere ThemeProvider");
  return value;
}
