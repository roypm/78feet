export function normalizeMemberSearch(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function memberHaystack(parts: (string | null | undefined)[]): string {
  return normalizeMemberSearch(parts.filter(Boolean).join(" "));
}

export function matchesMemberSearch(query: string, haystack: string): boolean {
  const needle = normalizeMemberSearch(query);
  if (!needle) return true;
  return haystack.includes(needle);
}
