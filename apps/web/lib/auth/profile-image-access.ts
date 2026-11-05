import { prisma } from "../db";

export async function canViewProfileImage(
  viewer: { id: string; role: string },
  target: { id: string; role: string },
): Promise<boolean> {
  if (viewer.id === target.id || viewer.role === "coach" || viewer.role === "admin") return true;
  if (target.role === "member") {
    return Boolean(
      await prisma.booking.findFirst({
        where: {
          status: "active",
          userId: viewer.id,
          instance: {
            bookings: { some: { userId: target.id, status: "active" } },
          },
        },
        select: { id: true },
      }),
    );
  }
  return Boolean(
    await prisma.classInstance.findFirst({
      where: { coachId: target.id },
      select: { id: true },
    }),
  );
}
