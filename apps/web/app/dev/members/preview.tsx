"use client";

import { useState } from "react";
import { TeamTable } from "@/components/team/team-table";
import { UnpaidMembersTable } from "@/components/payments/unpaid-members-table";
import { MembersTable, type MemberListRow } from "@/components/members/members-table";
import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { Button } from "@/components/ui/button";

const demo: MemberListRow[] = [{
  id: "preview-active", status: "active", firstName: "Marta", lastName: "García",
  dni: "12345678Z", phone: null, email: "marta@example.com", profileImageUrl: null,
  membership: null, packBalance: 0, paymentBoxName: "Box 1",
}];

const worst: MemberListRow[] = [
  { ...demo[0], id: "preview-inactive", status: "inactive", firstName: "María José",
    lastName: "de la Cruz y Fernández", phone: "+34 612 345 678",
    email: "bartholomew.fitzgerald@northwind-industries-holdings.example.com",
    paymentBoxName: "Box Sant Cugat del Vallès",
    membership: { tariffName: "Entrenamiento completo trimestral de mañana y tarde",
      consumptionModel: "weekly_quota", billingPeriod: "quarterly" }, packBalance: 125 },
  { ...demo[0], id: "preview-short", firstName: "Jo", lastName: "", dni: null,
    email: null, paymentBoxName: null },
  { ...demo[0], id: "preview-unicode", firstName: "Đặng", lastName: "Thị Ngọc Hân" },
];

const datasets = { "Demo data": demo, "Worst case": worst, Empty: [], Filtered: [], One: worst.slice(0, 1) };

export function MembersPreview({ initialMode }: { initialMode?: string }) {
  const [mode, setMode] = useState<keyof typeof datasets>(() =>
    (Object.keys(datasets) as (keyof typeof datasets)[]).find((value) => value === initialMode) ?? "Demo data");
  function changeMode(next: keyof typeof datasets) {
    setMode(next);
    window.history.replaceState(null, "", `?data=${encodeURIComponent(next)}`);
  }
  const filterControl = <Button type="button" variant="outline" className="min-h-11">Filtrar y ordenar</Button>;
  const filteredEmpty = <ListEmptyBlock title="No hay cuentas con estos filtros">
    <Button type="button" variant="outline" className="min-h-11" onClick={() => changeMode("Demo data")}>Restablecer filtros</Button>
  </ListEmptyBlock>;
  return (
    <main className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap gap-3" aria-label="Datos de prueba">
        {(Object.keys(datasets) as (keyof typeof datasets)[]).map((value) => (
          <Button key={value} variant={mode === value ? "default" : "outline"}
            onClick={() => changeMode(value)} aria-pressed={mode === value}>{value}</Button>
        ))}
      </div>
      <MembersTable members={datasets[mode]} filters={filterControl}
        emptyState={mode === "Filtered" ? filteredEmpty : <ListEmptyBlock title="Todavía no hay socios" />} />
      {mode === "Empty" || mode === "Filtered" ? (
        <>
          <h2 className="text-base font-medium">Equipo</h2>
          <TeamTable staff={[]} currentUserId="preview" filters={filterControl}
            emptyState={mode === "Filtered" ? filteredEmpty : <ListEmptyBlock title="Todavía no hay cuentas de equipo" />} />
          <h2 className="text-base font-medium">Impagos</h2>
          <UnpaidMembersTable members={[]} filters={filterControl}
            emptyState={<ListEmptyBlock title="No hay pagos pendientes" />} />
        </>
      ) : null}
      {mode === "Worst case" ? (
        <ListEmptyBlock title="No hay clases de entrenamiento funcional y preparación de competición para esta semana"
          description="Este mensaje conserva su ancho y crece con el contenido incluso en una pantalla estrecha o con texto ampliado." />
      ) : null}
    </main>
  );
}
