import { Suspense } from "react";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/current";
import { listMembers } from "@/lib/box/members";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Socios" />
          <ModuleBody width="full">
            <p className="text-muted-foreground">Cargando socios…</p>
          </ModuleBody>
        </ModulePage>
      }
    >
      <Members />
    </Suspense>
  );
}

async function Members() {
  await requireStaff();
  const members = await listMembers("active");

  return (
    <ModulePage>
      <ModuleHeader
        title="Socios"
        action={
          <Button nativeButton={false} render={<Link href="/staff/socios/nuevo" />}>
            Alta
          </Button>
        }
      />
      <ModuleBody width="full">
        {members.length === 0 ? (
          <p className="text-muted-foreground">Todavía no hay socios.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Tarifa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <Link href={`/staff/socios/${member.id}`} className="text-primary">
                      {member.firstName} {member.lastName}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums">{member.dni}</TableCell>
                  <TableCell>{member.membership?.tariffName ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ModuleBody>
    </ModulePage>
  );
}
