import { randomUUID } from "node:crypto";
import { prisma } from "../db";
import { BoxError } from "./errors";
import { matchesImageSignature } from "./image-bytes";
import { CLASS_IMAGE_EXTENSIONS, CLASS_IMAGE_MAX_BYTES } from "./image-upload";

const DATABASE_IMAGE_PREFIX = "db_";

export function classTypeImageUrl(imageKey: string | null): string | null {
  if (!imageKey) return null;
  return `/api/v1/class-type-images/${encodeURIComponent(imageKey)}`;
}

export async function saveClassTypeImage(file: File): Promise<string> {
  const ext = Object.hasOwn(CLASS_IMAGE_EXTENSIONS, file.type) ? CLASS_IMAGE_EXTENSIONS[file.type] : undefined;
  if (!ext) {
    throw new BoxError(400, "FORBIDDEN", "La imagen tiene que ser JPEG, PNG o WebP");
  }
  if (file.size > CLASS_IMAGE_MAX_BYTES) {
    throw new BoxError(400, "FORBIDDEN", "La imagen no puede superar 5 MB");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!matchesImageSignature(bytes, file.type)) {
    throw new BoxError(400, "FORBIDDEN", "El contenido no coincide con el formato de imagen");
  }
  const key = `${DATABASE_IMAGE_PREFIX}${randomUUID()}`;
  await prisma.classTypeImage.create({
    data: {
      id: key,
      mimeType: file.type,
      data: bytes,
    },
  });
  return key;
}

export async function removeClassTypeImage(imageKey: string | null | undefined): Promise<void> {
  if (!imageKey) return;
  try {
    await prisma.classTypeImage.deleteMany({ where: { id: imageKey } });
  } catch {
    // La imagen nueva ya está guardada; si falla la limpieza, queda un archivo huérfano.
  }
}
