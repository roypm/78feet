import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/current";
import { listMembers } from "@/lib/box/members";
import { listDay } from "@/lib/box/staff-calendar";
import { localDateString } from "@78feet/domain";
import { StaffBookingForm } from "@/components/staff/staff-booking-form";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Reservas" />
          <ModuleBody>
            <p className="text-muted-foreground">Cargando reservas…</p>
          </ModuleBody>
        </ModulePage>
      }
    >
      <Bookings />
    </Suspense>
  );
}

async function Bookings() {
  await requireStaff();
  const today = localDateString(new Date());
  const [members, classes] = await Promise.all([listMembers("active"), listDay(today)]);
  const open = classes.filter((item) => item.status === "scheduled");

  return (
    <ModulePage>
      <ModuleHeader title="Reservas" />
      <ModuleBody>
        <p className="text-sm text-muted-foreground">
          Reserva o cancelá a nombre de un socio. Las clases de hoy aparecen abajo; para otra fecha, abrí la clase desde
          Excepciones.
        </p>
        <StaffBookingForm
          members={members.map((member) => ({
            id: member.id,
            name: `${member.firstName} ${member.lastName}`,
          }))}
          classes={open.map((item) => ({
            id: item.id,
            label: `${item.name} · ${new Date(item.startAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })}`,
            roster: item.roster,
          }))}
        />
      </ModuleBody>
    </ModulePage>
  );
}
