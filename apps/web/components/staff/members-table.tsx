"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { memberFullName } from "@/lib/box/format";
import { cn } from "cn";

export type MemberListRow = {
  id: string;
  firstName: string;
  lastName: string;
  dni: string | null;
  phone: string | null;
  email: string | null;
  membership: {
    tariffName: string;
    tariffKind: "monthly" | "pack";
  } | null;
  /** Saldo de bono (desborde), independiente del nombre de la tarifa. */
  packBalance: number;
};

function memberAriaLabel(member: MemberListRow): string {
  const name = memberFullName(member.firstName, member.lastName);
  const parts = [
    name,
    member.dni,
    member.phone,
    member.email,
    member.membership?.tariffKind === "monthly" ? "Mensual" : member.membership?.tariffName,
    member.membership?.tariffKind === "monthly" && member.packBalance > 0 ? `${member.packBalance} bono` : null,
  ].filter((part): part is string => Boolean(part));
  return parts.join(", ");
}

function TariffLabels({
  membership,
  packBalance,
}: {
  membership: MemberListRow["membership"];
  packBalance: number;
}) {
  if (!membership) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  if (membership.tariffKind === "monthly") {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="shrink-0" title={membership.tariffName}>
          Mensual
        </Badge>
        {packBalance > 0 ? (
          <Badge variant="outline" className="shrink-0 tabular-nums" title="Saldo de bono">
            {packBalance} bono
          </Badge>
        ) : null}
      </div>
    );
  }

  return (
    <Badge variant="outline" className="max-w-full truncate" title={membership.tariffName}>
      {membership.tariffName}
    </Badge>
  );
}

function CellText({
  value,
  className,
  title,
}: {
  value: string;
  className?: string;
  title?: string;
}) {
  return (
    <span className={cn("block min-w-0 truncate text-sm", className)} title={title ?? (value !== "—" ? value : undefined)}>
      {value}
    </span>
  );
}

export function MembersTable({ members }: { members: MemberListRow[] }) {
  const router = useRouter();

  function openMember(id: string) {
    router.push(`/staff/socios/${id}`);
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-card ring-1 ring-foreground/10">
      <Table className="min-w-[20rem] md:min-w-[44rem]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-10 w-[30%] min-w-[9rem] px-3">Socio</TableHead>
            <TableHead className="hidden h-10 w-[14%] min-w-[6.5rem] px-3 sm:table-cell">Teléfono</TableHead>
            <TableHead className="hidden h-10 w-[26%] min-w-[10rem] px-3 md:table-cell">Email</TableHead>
            <TableHead className="hidden h-10 w-[10%] min-w-[5.5rem] px-3 lg:table-cell">DNI</TableHead>
            <TableHead className="h-10 w-[30%] min-w-[9rem] px-3">Tarifa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const fullName = memberFullName(member.firstName, member.lastName);
            const phone = member.phone ?? "—";
            const email = member.email ?? "—";
            const dni = member.dni ?? "—";

            return (
              <TableRow
                key={member.id}
                tabIndex={0}
                role="link"
                aria-label={memberAriaLabel(member)}
                className="cursor-pointer border-border hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-inset"
                onClick={() => openMember(member.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openMember(member.id);
                  }
                }}
              >
                <TableCell className="min-w-[9rem] px-3 py-2.5 align-middle">
                  <div className="min-w-0">
                    <span className="block font-medium wrap-break-word">{fullName}</span>
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground sm:hidden">
                      {[member.dni, member.phone].filter(Boolean).join(" · ") || null}
                    </span>
                    {member.email ? (
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground sm:hidden" title={member.email}>
                        {member.email}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="hidden max-w-[8rem] px-3 py-2.5 align-middle sm:table-cell">
                  <CellText value={phone} className="tabular-nums" title={member.phone ?? undefined} />
                </TableCell>
                <TableCell className="hidden max-w-[16rem] px-3 py-2.5 align-middle md:table-cell">
                  <CellText value={email} title={member.email ?? undefined} />
                </TableCell>
                <TableCell className="hidden px-3 py-2.5 align-middle lg:table-cell">
                  <CellText value={dni} className="tabular-nums" title={member.dni ?? undefined} />
                </TableCell>
                <TableCell className="max-w-[14rem] px-3 py-2.5 align-middle">
                  <TariffLabels membership={member.membership} packBalance={member.packBalance} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
