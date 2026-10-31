// Calendar dates stay local: never serialize them through toISOString()/UTC.
export function dateFromValue(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, year, month, day] = match.map(Number);
  if (year < 1) return undefined;
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : undefined;
}

export function dateToValue(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDateValue(value: string): string {
  if (!dateFromValue(value)) return "";
  return value.split("-").reverse().join("/");
}

export function parseDateInput(text: string): string | undefined {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim())
    ?? /^(\d{2})(\d{2})(\d{4})$/.exec(text.trim());
  if (!match) return undefined;
  const value = `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  return dateFromValue(value) ? value : undefined;
}

export function parseTimeInput(text: string): string | undefined {
  const match = /^(\d{1,2}):?(\d{2})$/.exec(text.trim());
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return undefined;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}
