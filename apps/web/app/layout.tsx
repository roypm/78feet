import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "78feet",
  description: "Gestión del box",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
