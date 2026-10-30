export const PAGE_SIZE = 25;
export type PageWindow = { skip: number; take: number };
export type PageInfo = { page: number; pageSize: number; total: number; totalPages: number };

export function pageNumber(value?: string): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export async function paginate<T>(total: number, requested: number, load: (window: PageWindow) => Promise<T[]>) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, requested), totalPages);
  const items = total === 0 ? [] : await load({ skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE });
  return { items, pageInfo: { page, pageSize: PAGE_SIZE, total, totalPages } };
}
