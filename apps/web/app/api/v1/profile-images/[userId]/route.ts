import { loadActiveUserFromRequest } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

function isUuid(value: string): boolean {
  return /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);
}

async function canViewImage(viewer: { id: string; role: string }, target: { id: string; role: string }): Promise<boolean> {
  if (viewer.id === target.id || viewer.role === "coach" || viewer.role === "admin") return true;
  if (target.role === "member") {
    return Boolean(await prisma.booking.findFirst({
      where: { userId: target.id, status: "active" },
      select: { id: true },
    }));
  }
  return Boolean(await prisma.classInstance.findFirst({
    where: { coachId: target.id },
    select: { id: true },
  }));
}

export async function GET(
  request: Request,
  context: { params: Promise<{ userId: string }> },
): Promise<Response> {
  const viewer = await loadActiveUserFromRequest(request);
  if (!viewer) return jsonError("FORBIDDEN", 401, "Tenés que entrar");

  const { userId } = await context.params;
  if (!isUuid(userId)) return new Response(null, { status: 404 });

  const image = await prisma.userProfileImage.findUnique({
    where: { userId },
    select: {
      mimeType: true,
      data: true,
      user: { select: { id: true, role: true } },
    },
  });
  if (!image || !(await canViewImage(viewer, image.user))) return new Response(null, { status: 404 });

  return new Response(image.data, {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "private, max-age=60, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
