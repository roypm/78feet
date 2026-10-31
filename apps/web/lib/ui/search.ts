export function normalizeSearch(text: string): string {
  return text.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export function searchHaystack(parts: (string | null | undefined)[]): string {
  return normalizeSearch(parts.filter(Boolean).join(" "));
}

export function matchesSearch(query: string, haystack: string): boolean {
  const needle = normalizeSearch(query);
  return !needle || haystack.includes(needle);
}
