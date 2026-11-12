import { Prisma } from "@prisma/client";

export function slugBase(name: string): string {
  return name.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80).replace(/-$/, "") || "item";
}

/** The unique index arbitrates concurrent creations; renaming never regenerates the slug. */
export async function createWithSlug<T>(name: string, create: (slug: string) => Promise<T>): Promise<T> {
  const base = slugBase(name);
  for (let suffix = base === "todos" ? 2 : 1; ; suffix++) {
    const slug = suffix === 1 ? base : `${base}-${suffix}`;
    try {
      return await create(slug);
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002"
        || !Array.isArray(error.meta?.target) || !error.meta.target.includes("slug")) throw error;
    }
  }
}
