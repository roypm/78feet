import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current";

export const instant = false;

export default async function Home() {
  const user = await getCurrentUser();

  if (user?.role === "member") redirect("/calendario");
  if (user) redirect("/staff/hoy");

  redirect("/login");
}
