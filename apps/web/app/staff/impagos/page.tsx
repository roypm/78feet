import { Suspense } from "react";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/current";
import { listUnpaid } from "@/lib/box/unpaid";
import { formatMonth, formatPrice } from "@/lib/box/format";
import { MarkPaidButton } from "@/components/staff/mark-paid-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Impagos" />
          <ModuleBody width="full">
            <p className="text-muted-foreground">Cargando impagos…</p>
          </ModuleBody>
        </ModulePage>
      }
    >
      <Unpaid />
    </Suspense>
  );
}

async function Unpaid() {
  await requireStaff();
  const unpaid = await listUnpaid();

  return (
    <ModulePage>
      <ModuleHeader
        title="Impagos"
        description={`Socios con cuota sin marcar pagada · ${formatMonth(unpaid.month)}`}
      />
      <ModuleBody width="full">
        {unpaid.members.length === 0 ? (
          <p className="text-muted-foreground">Nadie con impago este mes.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Socio</TableHead>
                <TableHead>Tarifa</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unpaid.members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <Link href={`/staff/socios/${member.id}`} className="text-primary">
                      {member.firstName} {member.lastName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {member.tariffName} · {formatPrice(member.priceCents)}
                  </TableCell>
                  <TableCell>
                    <MarkPaidButton userId={member.id} month={unpaid.month} amountCents={member.priceCents} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ModuleBody>
    </ModulePage>
  );
}
