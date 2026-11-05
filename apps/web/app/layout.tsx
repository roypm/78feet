import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { getCurrentUser } from "@/lib/auth/current";
import "./globals.css";

export const metadata: Metadata = {
  title: "78feet",
  description: "Gestión del box",
};

export const instant = false;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#d8d8d8" },
    { media: "(prefers-color-scheme: dark)", color: "#303030" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  const theme = user?.theme ?? "system";
  return (
    <html lang="es" data-theme={theme}>
      <body>
        <ThemeProvider initialTheme={theme}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
