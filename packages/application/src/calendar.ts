import { MissingResource } from "./errors.ts";
import { sql, type SQL } from "drizzle-orm";
import {
  DomainError,
  horizonRange,
  localDateString,
  memberCanCancel,
  rosterName,
} from "@78feet/domain";
import type { Database } from "@78feet/db/connection";
import { getTraining } from "./trainings.ts";

export type CalendarClass = {
  id: string;
  boxId: string;
  boxName: string;
  date: string;
  startAt: string;
  endAt: string;
  name: string;
  classTypeId: string;
  imageUrl: string | null;
  kind: "directed" | "open";
  status: "scheduled" | "cancelled";
  capacity: number;
  bookedCount: number;
  freeSpots: number;
  coachName: string | null;
  bookedByMe: boolean;
  isException: boolean;
  trainingId: string | null;
  coachProfileImageUrl: string | null;
  isExtra: boolean;
  isModified: boolean;
};
async function calendarRows(db: Database, where: SQL, viewerId: string | null) {
  return (
    await db.execute<CalendarClass>(sql`SELECT i.id,i.box_id AS "boxId",bx.name AS "boxName",i.date::text,i.start_at::text AS "startAt",i.end_at::text AS "endAt",t.name,i.class_type_id AS "classTypeId",CASE WHEN t.image_key IS NULL THEN NULL ELSE '/api/v1/class-type-images/'||t.image_key END AS "imageUrl",i.kind,i.status,i.capacity,
    coalesce(b.n,0)::int AS "bookedCount",greatest(0,i.capacity-coalesce(b.n,0))::int AS "freeSpots",c.first_name||' '||c.last_name AS "coachName",
    EXISTS(SELECT 1 FROM booking mine WHERE mine.instance_id=i.id AND mine.user_id=${viewerId}::uuid AND mine.status='active') AS "bookedByMe",(i.template_id IS NULL OR i.edited_at IS NOT NULL) AS "isException",i.training_id AS "trainingId",(i.template_id IS NULL) AS "isExtra",(i.template_id IS NOT NULL AND i.edited_at IS NOT NULL) AS "isModified",CASE WHEN img.updated_at IS NULL THEN NULL ELSE '/api/v1/profile-images/'||c.id||'?v='||floor(extract(epoch FROM img.updated_at)*1000)::text END AS "coachProfileImageUrl"
    FROM class_instance i JOIN class_type t ON t.id=i.class_type_id JOIN box bx ON bx.id=i.box_id LEFT JOIN "user" c ON c.id=i.coach_id LEFT JOIN user_profile_image img ON img.user_id=c.id
    LEFT JOIN LATERAL(SELECT count(*) n FROM booking WHERE instance_id=i.id AND status='active') b ON true
    WHERE ${where} ORDER BY i.date,i.start_at,i.id`)
  ).rows.map((row) => ({
    ...row,
    startAt: new Date(row.startAt).toISOString(),
    endAt: new Date(row.endAt).toISOString(),
  }));
}
export async function listCalendar(
  db: Database,
  viewerId: string | null,
  from: string,
  to: string,
  boxId?: string,
  now = new Date(),
  staff = false,
) {
  if (from > to) throw new DomainError("FORBIDDEN", "El rango no es válido");
  const horizon = horizonRange(localDateString(now));
  const start = staff || from >= horizon.from ? from : horizon.from;
  const end = staff || to <= horizon.to ? to : horizon.to;
  if (start > end) return [];
  return calendarRows(
    db,
    sql`i.date BETWEEN ${start}::date AND ${end}::date ${boxId ? sql`AND i.box_id=${boxId}::uuid` : sql``}`,
    viewerId,
  );
}
export async function getInstanceDetail(
  db: Database,
  viewer: { id: string; role: string },
  id: string,
  now = new Date(),
) {
  const [row] = await calendarRows(db, sql`i.id=${id}::uuid`, viewer.id);
  if (!row) throw new MissingResource("La clase no existe");
  const people = await db.execute<{
    bookingId: string;
    userId: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    profileImageUrl: string | null;
  }>(
    sql`SELECT b.id AS "bookingId",u.id AS "userId",u.first_name AS "firstName",u.last_name AS "lastName",u.phone,CASE WHEN img.updated_at IS NULL THEN NULL ELSE '/api/v1/profile-images/'||u.id||'?v='||floor(extract(epoch FROM img.updated_at)*1000)::text END AS "profileImageUrl" FROM booking b JOIN "user" u ON u.id=b.user_id LEFT JOIN user_profile_image img ON img.user_id=u.id WHERE b.instance_id=${id}::uuid AND b.status='active' ORDER BY u.first_name,u.last_name,u.id`,
  );
  const mine = people.rows.find((p) => p.userId === viewer.id);
  return {
    ...row,
    bookingId: mine?.bookingId ?? null,
    canBook:
      viewer.role === "member" &&
      row.status === "scheduled" &&
      new Date(row.startAt) > now &&
      !mine &&
      row.freeSpots > 0,
    canCancel: !!mine && memberCanCancel(now, new Date(row.startAt)),
    training: row.trainingId ? await getTraining(db, row.trainingId) : null,
    roster: people.rows.map((p) =>
      viewer.role === "member"
        ? {
            userId: p.userId,
            name: rosterName(p.firstName, p.lastName),
            profileImageUrl: p.profileImageUrl,
          }
        : {
            bookingId: p.bookingId,
            userId: p.userId,
            name: `${p.firstName} ${p.lastName}`,
            shortName: rosterName(p.firstName, p.lastName),
            phone: p.phone,
            profileImageUrl: p.profileImageUrl,
          },
    ),
  };
}
export async function listBookingPage(
  db: Database,
  userId: string,
  history: boolean,
  requested = 1,
  now = new Date(),
) {
  const where = sql`b.user_id=${userId}::uuid AND i.start_at ${history ? sql`<=` : sql`>`} ${now} ${history ? sql`` : sql`AND ((b.status='active' AND i.status='scheduled') OR (b.status='cancelled' AND b.quota_returned=true AND i.status='cancelled'))`}`;
  const count = await db.execute<{ n: number }>(
    sql`SELECT count(*)::int n FROM booking b JOIN class_instance i ON i.id=b.instance_id WHERE ${where}`,
  );
  const total = count.rows[0].n,
    totalPages = Math.max(1, Math.ceil(total / 25)),
    page = Math.min(
      Math.max(1, Number.isSafeInteger(requested) ? requested : 1),
      totalPages,
    );
  const items = await db.execute<{
    status: string;
    instance: { startAt: string; status: string };
  }>(sql`SELECT b.id,b.instance_id AS "instanceId",b.user_id AS "userId",b.pool,b.status,b.quota_returned AS "quotaReturned",b.created_by AS "createdBy",to_char(b.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",to_char(b.cancelled_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "cancelledAt",b.cancelled_by AS "cancelledBy",
    json_build_object('id',i.id,'date',i.date,'name',t.name,'boxName',bx.name,'kind',i.kind,'startAt',i.start_at,'endAt',i.end_at,'capacity',i.capacity,'status',i.status) AS instance,
    coach.first_name||' '||coach.last_name AS "coachName",CASE WHEN img.updated_at IS NULL THEN NULL ELSE '/api/v1/profile-images/'||coach.id||'?v='||floor(extract(epoch FROM img.updated_at)*1000)::text END AS "coachProfileImageUrl"
    FROM booking b JOIN class_instance i ON i.id=b.instance_id JOIN class_type t ON t.id=i.class_type_id JOIN box bx ON bx.id=i.box_id LEFT JOIN "user" coach ON coach.id=i.coach_id LEFT JOIN user_profile_image img ON img.user_id=coach.id
    WHERE ${where} ORDER BY i.start_at ${history ? sql`DESC` : sql`ASC`},b.id ASC LIMIT 25 OFFSET ${(page - 1) * 25}`);
  return {
    items: items.rows.map((row) => ({
      ...row,
      canCancel:
        row.status === "active" &&
        memberCanCancel(now, new Date(row.instance.startAt)),
      boxCancelled: row.instance.status === "cancelled",
    })),
    pageInfo: { page, pageSize: 25, total, totalPages },
  };
}
export async function listExceptionsPage(
  db: Database,
  requested = 1,
  from = localDateString(new Date()),
) {
  const count = await db.execute<{ n: number }>(
    sql`SELECT count(*)::int n FROM class_instance WHERE date>=${from}::date AND (template_id IS NULL OR edited_at IS NOT NULL OR status='cancelled')`,
  );
  const total = count.rows[0].n;
  const totalPages = Math.max(1, Math.ceil(total / 25));
  const page = Math.min(Math.max(1, requested), totalPages);
  const ids = await db.execute<{ id: string }>(
    sql`SELECT id FROM class_instance WHERE date>=${from}::date AND (template_id IS NULL OR edited_at IS NOT NULL OR status='cancelled') ORDER BY date ASC,start_at ASC,id LIMIT 25 OFFSET ${(page - 1) * 25}`,
  );
  const items = ids.rows.length
    ? await calendarRows(
        db,
        sql`i.id IN (${sql.join(
          ids.rows.map((r) => sql`${r.id}::uuid`),
          sql`,`,
        )})`,
        null,
      )
    : [];
  return {
    items: items.map((i) => ({
      ...i,
      kinds: [
        ...(i.isExtra ? ["extra"] : []),
        ...(i.isModified ? ["modified"] : []),
        ...(i.status === "cancelled" ? ["cancelled"] : []),
      ],
    })),
    pageInfo: { page, pageSize: 25, total, totalPages },
  };
}
