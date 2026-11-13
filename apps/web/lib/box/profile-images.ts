export function profileImageUrl(
  userId: string,
  updatedAt: Date | null | undefined,
): string | null {
  if (!updatedAt) return null;
  return `/api/v1/profile-images/${encodeURIComponent(userId)}?v=${updatedAt.getTime()}`;
}
