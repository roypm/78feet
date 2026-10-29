export type HistoryMonth<T> = {
  month: string;
  items: T[];
};

export function groupHistoryByMonth<T extends { instance: { date: string; startAt: string } }>(
  items: readonly T[],
): HistoryMonth<T>[] {
  const sorted = [...items].sort((a, b) => {
    const byDate = b.instance.date.localeCompare(a.instance.date);
    if (byDate !== 0) return byDate;
    return b.instance.startAt.localeCompare(a.instance.startAt);
  });

  const groups: HistoryMonth<T>[] = [];
  for (const item of sorted) {
    const month = item.instance.date.slice(0, 7);
    const current = groups[groups.length - 1];
    if (current && current.month === month) current.items.push(item);
    else groups.push({ month, items: [item] });
  }
  return groups;
}
