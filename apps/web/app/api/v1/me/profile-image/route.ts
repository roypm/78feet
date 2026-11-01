import { BoxError } from "@/lib/box/errors";
import { removeProfileImage, saveProfileImage } from "@/lib/box/profile-images";
import { sessionHandler } from "@/lib/box/guard";

const PROFILE_ROLES = ["member", "coach", "admin"] as const;

export const POST = sessionHandler(PROFILE_ROLES, async (user, request) => {
  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File)) throw new BoxError(400, "FORBIDDEN", "Elegí una foto de perfil");
  const imageUrl = await saveProfileImage(user.id, image);
  return { imageUrl };
});

export const DELETE = sessionHandler(PROFILE_ROLES, async (user) => {
  await removeProfileImage(user.id);
  return { ok: true };
});
