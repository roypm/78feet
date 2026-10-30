import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current";
import { listTariffs } from "@/lib/box/tariffs";
import { formatPrice } from "@/lib/box/format";
import { TariffForm } from "@/components/staff/tariff-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ModuleBody, ModuleHeader, ModulePage, ModulePrimaryAction } from "@/components/member/module-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ModulePage>
          <ModuleHeader title="Tarifas" />
          <ModuleBody width="full">
            <p className="text-muted-foreground">Cargando tarifas…</p>
          </ModuleBody>
        </ModulePage>
      }
    >
      <Tariffs />
    </Suspense>
  );
}

async function Tariffs() {
  await requireAdmin();
  const tariffs = await listTariffs();

  return (
    <ModulePage>
      <ModuleHeader title="Tarifas" description="Cupos semanales y precios que se asignan a los socios." />
      <ModuleBody width="full" inset="content">
        <ModulePrimaryAction>
          <TariffForm />
        </ModulePrimaryAction>
        {tariffs.length === 0 ? (
          <p className="text-muted-foreground">Todavía no hay tarifas.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Cupo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tariffs.map((tariff) => (
                <TableRow key={tariff.id}>
                  <TableCell>{tariff.name}</TableCell>
                  <TableCell>{tariff.kind === "monthly" ? "Mensual" : "Bono"}</TableCell>
                  <TableCell>{formatPrice(tariff.priceCents)}</TableCell>
                  <TableCell>
                    {tariff.kind === "monthly"
                      ? `${tariff.weeklyDirected} dir. / ${tariff.weeklyOpen} open`
                      : `${tariff.packClasses ?? 0} clases`}
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
