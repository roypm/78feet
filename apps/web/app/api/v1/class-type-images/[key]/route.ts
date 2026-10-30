import { loadActiveUserFromRequest } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string }> },
): Promise<Response> {
  const user = await loadActiveUserFromRequest(request);
  if (!user) return jsonError("FORBIDDEN", 401, "Tenés que entrar");

  const { key } = await context.params;
  if (!key.startsWith("db_")) return new Response(null, { status: 404 });

  const image = await prisma.classTypeImage.findUnique({ where: { id: key } });
  if (!image) return new Response(null, { status: 404 });

  return new Response(image.data, {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "private, max-age=3600, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
