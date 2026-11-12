import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { SearchEmptyState } from "@/components/common/lists/search-empty-state";
import { TeamTable } from "@/components/team/team-table";
import { MembersTable } from "@/components/members/members-table";
import { UnpaidMembersTable } from "@/components/payments/unpaid-members-table";
import { TrainingLibraryTable } from "@/components/trainings/training-library-table";
import { listOptionsHref } from "@/lib/box/list-sorting";

vi.stubGlobal("React", React);
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
const render = (element: React.ReactElement) => renderToStaticMarkup(element);
const filters = createElement("button", null, "Filtrar y ordenar");
const emptyState = createElement(ListEmptyBlock, {
  title: "No hay resultados con estos filtros",
  href: listOptionsHref("/staff/equipo", {}, "nombre-desc", "rol"), action: "Restablecer filtros",
});

describe("one empty presentation for every list", () => {
  const tables = [
    ["Equipo", createElement(TeamTable, { staff: [], currentUserId: "test", filters, emptyState })],
    ["Socios", createElement(MembersTable, { members: [], filters, emptyState })],
    ["Impagos", createElement(UnpaidMembersTable, { members: [], filters, emptyState })],
    ["Biblioteca", createElement(TrainingLibraryTable, { trainings: [], filters, emptyState })],
  ] as const;
  for (const [name, table] of tables) {
    it(`${name} keeps controls but omits headers, nested cells and decorative icons`, () => {
      const html = render(table);
      expect(html).toContain("Filtrar y ordenar");
      expect(html).toContain("Restablecer filtros");
      expect(html).toContain('href="/staff/equipo?orden=nombre-desc"');
      expect(html).not.toMatch(/<(table|thead|td)\b/);
      expect(html.match(/data-slot="empty"/g)).toHaveLength(1);
      expect(html).not.toContain('data-slot="empty-icon"');
    });
  }
  it("gives search misses the same block and a direct clear action", () => {
    const html = render(createElement(SearchEmptyState, { onClear: vi.fn() }));
    expect(html).toContain("No hay coincidencias en esta página");
    expect(html).toContain("Limpiar búsqueda");
    expect(html).toContain("min-h-36");
    expect(html).not.toContain('data-slot="empty-icon"');
  });
  it("shows no artificial action when there is nothing pending", () => {
    const html = render(createElement(ListEmptyBlock, { title: "No hay pagos pendientes" }));
    expect(html).not.toMatch(/<(button|a)\b/);
    expect(html).not.toContain('data-slot="empty-content"');
  });
});
