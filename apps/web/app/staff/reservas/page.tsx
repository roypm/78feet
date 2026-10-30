import { redirect } from "next/navigation";

/** Reservas staff viven en el detalle de clase (Semana / Hoy / Excepciones). */
export default function Page() {
  redirect("/staff/semana");
}
