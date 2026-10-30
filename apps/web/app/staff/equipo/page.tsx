import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current";
import { listStaff } from "@/lib/box/staff-users";
import { StaffForm } from "@/components/staff/staff-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ModuleBody, ModuleHeader, ModulePage, ModulePrimaryAction } from "@/components/member/module-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Equipo" />
          <ModuleBody width="full">
            <p className="text-muted-foreground">Cargando el equipo…</p>
          </ModuleBody>
        </ModulePage>
      }
    >
      <Team />
    </Suspense>
  );
}

async function Team() {
  await requireAdmin();
  const staff = await listStaff();

  return (
    <ModulePage>
      <ModuleHeader
        title="Equipo"
        description="Cuentas de coach y admin con acceso al panel de staff."
      />
      <ModuleBody width="full" inset="content">
        <ModulePrimaryAction>
          <StaffForm />
        </ModulePrimaryAction>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((person) => (
              <TableRow key={person.id}>
                <TableCell>
                  {person.firstName} {person.lastName}
                </TableCell>
                <TableCell>{person.loginId}</TableCell>
                <TableCell>{person.role === "admin" ? "Admin" : "Coach"}</TableCell>
                <TableCell>{person.status === "active" ? "Activo" : "Inactivo"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ModuleBody>
    </ModulePage>
  );
}
