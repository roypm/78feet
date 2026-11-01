export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export function profileImageFileError(file: Pick<File, "type" | "size">): string | null {
  if (!PROFILE_IMAGE_ACCEPT.split(",").includes(file.type)) {
    return "La foto tiene que ser JPEG, PNG o WebP.";
  }
  if (file.size === 0) return "El archivo está vacío. Elegí otra foto.";
  if (file.size > PROFILE_IMAGE_MAX_BYTES) return "La foto no puede superar 5 MB.";
  return null;
}
