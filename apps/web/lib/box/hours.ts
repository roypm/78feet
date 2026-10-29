import { assertValidTimeRange, BOX_CLOSE_TIME, BOX_OPEN_TIME, type HoursWrite } from "@78feet/domain";
import { prisma } from "../db";
import { clockFromDb, clockToDb, normalizeClock } from "./time";

const DEFAULT_ID = "default";

export type HoursView = {
  openTime: string;
  closeTime: string;
};

function toView(openTime: string, closeTime: string): HoursView {
  return { openTime: openTime.slice(0, 5), closeTime: closeTime.slice(0, 5) };
}

export async function getBoxHours(): Promise<HoursView> {
  const row = await prisma.boxSettings.findUnique({ where: { id: DEFAULT_ID } });
  if (!row) return toView(BOX_OPEN_TIME, BOX_CLOSE_TIME);
  return toView(clockFromDb(row.openTime), clockFromDb(row.closeTime));
}

export async function updateBoxHours(input: HoursWrite): Promise<HoursView> {
  const openTime = normalizeClock(input.openTime);
  const closeTime = normalizeClock(input.closeTime);
  assertValidTimeRange(openTime, closeTime);
  const row = await prisma.boxSettings.upsert({
    where: { id: DEFAULT_ID },
    create: { id: DEFAULT_ID, openTime: clockToDb(openTime), closeTime: clockToDb(closeTime) },
    update: { openTime: clockToDb(openTime), closeTime: clockToDb(closeTime) },
  });
  return toView(clockFromDb(row.openTime), clockFromDb(row.closeTime));
}
