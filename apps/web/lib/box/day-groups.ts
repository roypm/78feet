import type { ClassKind } from "@78feet/domain";

/** Lo que elige el selector: la vista, que es lo que viaja en `?tipo=`. */
export type KindView = "dirigidas" | "open";

export function kindViewFromParam(value: string | undefined): KindView {
  return value === "open" ? "open" : "dirigidas";
}

export function viewKind(view: KindView): ClassKind {
  return view === "open" ? "open" : "directed";
}

export function groupDayByKind<T extends { kind: ClassKind }>(
  items: T[],
): { kind: ClassKind; items: T[] }[] {
  return [
    { kind: "directed", items: items.filter((item) => item.kind === "directed") },
    { kind: "open", items: items.filter((item) => item.kind === "open") },
  ];
}
