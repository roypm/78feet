import { STORAGE_INT_MAX } from "@78feet/domain";

export function parseQuantity(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const value = Number(text.trim());
  return Number.isSafeInteger(value) && value <= STORAGE_INT_MAX ? value : null;
}

/** Parse euros exactly, without floating-point rounding or thousands separators. */
export function parseEuroCents(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const cents = BigInt(whole || "0") * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  return cents <= BigInt(STORAGE_INT_MAX) ? Number(cents) : null;
}

export function formatEuroCents(cents: number, separator = ","): string {
  return `${Math.floor(cents / 100)}${separator}${String(cents % 100).padStart(2, "0")}`;
}
