import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { BoxError } from "./errors";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const PLACEHOLDER_IMAGE_KEY = "placeholder.png";

export function classTypeImageUrl(imageKey: string): string {
  return `/uploads/class-types/${encodeURIComponent(imageKey)}`;
}

export function uploadsDir(): string {
  return join(process.cwd(), "public", "uploads", "class-types");
}

export async function saveClassTypeImage(file: File): Promise<string> {
  const ext = TYPES[file.type];
  if (!ext) {
    throw new BoxError(400, "FORBIDDEN", "La imagen tiene que ser JPEG, PNG o WebP");
  }
  if (file.size > MAX_BYTES) {
    throw new BoxError(400, "FORBIDDEN", "La imagen no puede superar 5 MB");
  }
  const key = `${randomUUID()}.${ext}`;
  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, key), Buffer.from(await file.arrayBuffer()));
  return key;
}

export async function removeClassTypeImage(imageKey: string): Promise<void> {
  if (!imageKey || imageKey === PLACEHOLDER_IMAGE_KEY) return;
  if (imageKey.includes("/") || imageKey.includes("..")) return;
  try {
    await unlink(join(uploadsDir(), imageKey));
  } catch {
    // el archivo puede no estar (tests, deploys)
  }
}
