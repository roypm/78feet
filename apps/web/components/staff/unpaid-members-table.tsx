"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SubscriptionBilling } from "@78feet/domain";
import { formatPrice } from "@/lib/box/format";
import { matchesMemberSearch, memberHaystack } from "@/lib/staff/member-search";
import { MarkPaidButton } from "@/components/staff/mark-paid-button";
import { MemberListSearch } from "@/components/staff/member-list-search";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type UnpaidMemberRow = {
  id: string;
  firstName: string;
  lastName: string;
  dni: string | null;
  phone: string | null;
  tariffName: string;
  priceCents: number;
  billingPeriod: SubscriptionBilling;
  periodStart: string;
  periodLabel: string;
};

export function UnpaidMembersTable({ members }: { members: UnpaidMemberRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      members.filter((member) =>
        matchesMemberSearch(
          query,
          memberHaystack([
            member.firstName,
            member.lastName,
            member.dni,
            member.phone,
            member.tariffName,
            member.periodLabel,
          ]),
        ),
      ),
    [members, query],
  );

  return (
    <div className="flex flex-col gap-3">
      <MemberListSearch
        value={query}
        onChange={setQuery}
        placeholder="Buscar por nombre, tarifa o periodo…"
      />
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ningún impago coincide con la búsqueda.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-card ring-1 ring-foreground/10">
          <Table className="min-w-[20rem] md:min-w-[36rem]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-10 min-w-[9rem] px-3">Socio</TableHead>
                <TableHead className="h-10 px-3">Tarifa</TableHead>
                <TableHead className="h-10 px-3">Periodo</TableHead>
                <TableHead className="h-10 w-0 px-3 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((member) => (
                <TableRow key={member.id} className="border-border">
                  <TableCell className="min-w-[9rem] px-3 py-2.5 align-middle">
                    <Link href={`/staff/socios/${member.id}`} className="font-medium text-primary">
                      {member.firstName} {member.lastName}
                    </Link>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm">
                    {member.tariffName} · {formatPrice(member.priceCents)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {member.periodLabel}
                  </TableCell>
                  <TableCell className="w-0 whitespace-nowrap px-3 py-2.5 align-middle text-right">
                    <MarkPaidButton
                      userId={member.id}
                      billingPeriod={member.billingPeriod}
                      periodStart={member.periodStart}
                      periodLabel={member.periodLabel}
                      amountCents={member.priceCents}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
