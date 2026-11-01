import { prisma } from "../db";
import { BoxError } from "./errors";
import { PROFILE_IMAGE_MAX_BYTES } from "./profile-image-upload";

export function profileImageUrl(userId: string, updatedAt: Date | null | undefined): string | null {
  if (!updatedAt) return null;
  return `/api/v1/profile-images/${encodeURIComponent(userId)}?v=${updatedAt.getTime()}`;
}

export async function getProfileImageUrlForUser(userId: string): Promise<string | null> {
  const image = await prisma.userProfileImage.findUnique({ where: { userId }, select: { updatedAt: true } });
  return profileImageUrl(userId, image?.updatedAt);
}

function matchesImageSignature(bytes: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mimeType === "image/webp") {
    return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
}

export async function saveProfileImage(userId: string, file: File): Promise<string> {
  if (file.size === 0) throw new BoxError(400, "FORBIDDEN", "El archivo está vacío");
  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    throw new BoxError(400, "FORBIDDEN", "La foto no puede superar 5 MB");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!matchesImageSignature(bytes, file.type)) {
    throw new BoxError(400, "FORBIDDEN", "El contenido no coincide con el formato de imagen");
  }

  const image = await prisma.userProfileImage.upsert({
    where: { userId },
    create: { userId, mimeType: file.type, data: bytes },
    update: { mimeType: file.type, data: bytes },
    select: { updatedAt: true },
  });
  return profileImageUrl(userId, image.updatedAt)!;
}

export async function removeProfileImage(userId: string): Promise<void> {
  await prisma.userProfileImage.deleteMany({ where: { userId } });
}
