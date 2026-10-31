// Shared by the upload UI and server storage validation. Keep this module browser-safe.
export const CLASS_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CLASS_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const CLASS_IMAGE_ACCEPT = Object.keys(CLASS_IMAGE_EXTENSIONS).join(",");

export function classImageFileError(file: Pick<File, "type" | "size">): string | null {
  if (!Object.hasOwn(CLASS_IMAGE_EXTENSIONS, file.type)) return "La imagen tiene que ser JPEG, PNG o WebP.";
  if (file.size > CLASS_IMAGE_MAX_BYTES) return "La imagen no puede superar 5 MB.";
  if (file.size === 0) return "La imagen está vacía. Elegí otro archivo.";
  return null;
}
