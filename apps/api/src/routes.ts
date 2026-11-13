import type { FastifyInstance } from "fastify";
import { eq, sql } from "drizzle-orm";
import * as c from "@78feet/contracts";
import { DomainError, addDays, localDateString } from "@78feet/domain";
import type { Database } from "@78feet/db/connection";
import {
  classTypeImage,
  classType,
  classInstance,
  box,
} from "@78feet/db/schema";
import * as catalog from "@78feet/application/catalog";
import * as queries from "@78feet/application/queries";
import * as profiles from "@78feet/application/profiles";
import * as bookings from "@78feet/application/bookings";
import * as calendar from "@78feet/application/calendar";
import * as members from "@78feet/application/members";
import * as identity from "@78feet/application/identity";
import * as instances from "@78feet/application/instances";
import * as templates from "@78feet/application/templates";
import * as trainings from "@78feet/application/trainings";
import * as payments from "@78feet/application/payments";
import * as schedule from "@78feet/application/schedule";
import { endpoints } from "./server.ts";
import type { createAuth } from "./auth.ts";
import {
  imageUrl,
  memberView,
  trainingView,
  staffInstanceView,
  bookingView,
} from "./views.ts";

const all = ["member", "coach", "admin"] as const,
  staff = ["coach", "admin"] as const,
  admin = ["admin"] as const,
  member = ["member"] as const;
const { z } = c;
const empty = z.object({});
const file = z.string().meta({ format: "binary" }).optional();
const classForm = z.object({
  name: z.string().min(1),
  kind: z.enum(["directed", "open"]),
  image: file,
});
const classPatchForm = z.object({
  name: z.string().min(1).optional(),
  image: file,
});
export const uploadBodies = {
  createClassType: classForm,
  updateClassType: classPatchForm,
  saveProfileImage: z.object({ image: file }),
};
const changeResult = z.object({
  id: c.id,
  cancelledBookingCount: z.number().int(),
});
const list = c.listQuery;
export function registerRoutes(
  app: FastifyInstance,
  db: Database,
  auth: ReturnType<typeof createAuth>,
) {
  const route = endpoints(app, auth);
  const targetBox = async (
    requested: string | undefined,
    preferred: string | null,
  ) => requested ?? preferred ?? (await catalog.listBoxes(db))[0]?.id;
  app.post(
    "/api/v1/auth/login",
    {
      schema: {
        operationId: "login",
        body: c.loginBody,
        response: {
          200: c.loginResponseSchema,
          400: c.error,
          403: c.error,
          429: c.error,
          500: c.error,
        },
      },
    },
    async (req, reply) => {
      const body = c.loginBody.parse(req.body);
      const result = await auth.login(
        body.access,
        body.loginId,
        body.password,
        req,
      );
      if (result.cookies) reply.header("Set-Cookie", result.cookies);
      return { user: result.user, theme: result.theme };
    },
  );
  app.post(
    "/api/v1/auth/logout",
    {
      schema: { operationId: "logout", response: { 200: c.ok, 403: c.error } },
    },
    async (req, reply) => {
      reply.header("Set-Cookie", await auth.logout(req));
      return { ok: true };
    },
  );
  route(
    "GET",
    "/auth/me",
    all,
    c.meResponseSchema,
    async ({ user }) => ({ user }),
    { operationId: "currentUser" },
  );
  route(
    "GET",
    "/me/profile",
    all,
    c.personDto,
    async ({ user }) => queries.getPerson(db, user.id),
    { operationId: "ownProfile" },
  );
  route(
    "GET",
    "/me/preferences",
    all,
    z.object({ theme: c.userThemeSchema, preferenceBoxId: c.id.nullable() }),
    async ({ user }) => ({
      theme: user.theme,
      preferenceBoxId: user.preferenceBoxId,
    }),
    { operationId: "preferences" },
  );
  route(
    "PATCH",
    "/me/preferences",
    all,
    z.object({ theme: c.userThemeSchema, preferenceBoxId: c.id.nullable() }),
    async ({ user, body }) => profiles.updatePreferences(db, user.id, body),
    { operationId: "updatePreferences", body: c.ownPreferencesSchema },
  );
  route(
    "GET",
    "/boxes",
    all,
    z.array(c.boxDto),
    async () => catalog.listBoxes(db),
    { operationId: "boxes" },
  );
  route(
    "GET",
    "/boxes/:id/hours",
    all,
    c.boxHoursConfigSchema,
    async ({ params }) => schedule.getBoxHours(db, params.id),
    { operationId: "boxHours", params: c.idParams },
  );
  route(
    "GET",
    "/me/summary",
    member,
    c.summaryDto,
    async ({ user }) => queries.getMemberSummary(db, user.id),
    { operationId: "ownSummary" },
  );
  for (const history of [false, true])
    route(
      "GET",
      history ? "/me/bookings/history" : "/me/bookings",
      member,
      c.page(c.historyView),
      async ({ user, query }) =>
        calendar.listBookingPage(db, user.id, history, query.page),
      {
        operationId: history ? "bookingHistory" : "upcomingBookings",
        query: list,
      },
    );
  route(
    "GET",
    "/calendar",
    member,
    z.array(c.classDto),
    async ({ user, query }) =>
      calendar.listCalendar(
        db,
        user.id,
        query.from,
        query.to,
        await targetBox(query.box, user.preferenceBoxId),
      ),
    {
      operationId: "calendar",
      query: c.calendarQuerySchema.extend({ box: c.id.optional() }),
    },
  );
  route(
    "GET",
    "/instances/:id",
    member,
    c.detailDto,
    async ({ user, params }) =>
      calendar.getInstanceDetail(
        db,
        { id: user.id, role: "member" },
        params.id,
      ),
    { operationId: "instance", params: c.idParams },
  );
  route(
    "POST",
    "/bookings",
    member,
    c.bookingView,
    async ({ user, body }) =>
      bookingView(
        db,
        (
          await bookings.reserve(
            db,
            body.instanceId,
            user.id,
            user.id,
            new Date(),
          )
        ).id,
      ),
    { operationId: "reserve", body: c.createBookingRequestSchema, status: 201 },
  );
  route(
    "DELETE",
    "/bookings/:id",
    member,
    c.bookingView,
    async ({ user, params }) =>
      bookingView(
        db,
        (await bookings.cancel(db, params.id, user.id, true, true, new Date()))
          .id,
      ),
    { operationId: "cancelOwnBooking", params: c.idParams },
  );
  route(
    "POST",
    "/admin/bookings",
    staff,
    c.bookingView,
    async ({ user, body }) =>
      bookingView(
        db,
        (
          await bookings.reserve(
            db,
            body.instanceId,
            body.userId,
            user.id,
            new Date(),
          )
        ).id,
      ),
    {
      operationId: "reserveForMember",
      body: c.createAdminBookingRequestSchema,
      status: 201,
    },
  );
  route(
    "DELETE",
    "/admin/bookings/:id",
    staff,
    c.bookingView,
    async ({ user, params, query }) =>
      bookingView(
        db,
        (
          await bookings.cancel(
            db,
            params.id,
            user.id,
            false,
            query.returnQuota !== "false",
            new Date(),
          )
        ).id,
      ),
    {
      operationId: "cancelMemberBooking",
      params: c.idParams,
      query: c.cancelAdminBookingQuerySchema,
    },
  );
  route(
    "GET",
    "/admin/members",
    staff,
    c.page(c.memberListDto),
    async ({ query }) =>
      queries.listMembersPage(db, query.status, query.page, query.order),
    { operationId: "members", query: list },
  );
  route(
    "GET",
    "/admin/members/options",
    staff,
    z.array(c.personOption),
    async () => queries.listMemberOptions(db),
    { operationId: "memberOptions" },
  );
  route(
    "POST",
    "/admin/members",
    staff,
    c.memberDto,
    async ({ body, user }) => {
      const boxId = await targetBox(body.paymentBoxId, null);
      const created = await identity.provisionAccount(db, {
        role: "member",
        firstName: body.firstName,
        lastName: body.lastName,
        dni: body.dni,
        loginId: body.dni,
        password: body.password,
        email: body.email,
        phone: body.phone,
        boxId,
        tariffId: body.tariffId,
      });
      return memberView(db, created.id);
    },
    {
      operationId: "createMember",
      body: c.createMemberSchema.extend({ email: c.emailRequired }),
      status: 201,
    },
  );
  route(
    "GET",
    "/admin/members/:id",
    staff,
    c.memberDto,
    async ({ params }) => memberView(db, params.id),
    { operationId: "member", params: c.idParams },
  );
  route(
    "PATCH",
    "/admin/members/:id",
    staff,
    c.memberDto,
    async ({ params, body }) => {
      await profiles.updateMember(db, params.id, body);
      return memberView(db, params.id);
    },
    {
      operationId: "updateMember",
      params: c.idParams,
      body: c.patchMemberSchema.safeExtend({
        email: c.emailRequired.optional(),
      }),
    },
  );
  route(
    "GET",
    "/admin/members/:id/summary",
    staff,
    c.summaryDto,
    async ({ params }) => {
      await queries.getPerson(db, params.id, "member");
      return queries.getMemberSummary(db, params.id);
    },
    { operationId: "memberSummary", params: c.idParams },
  );
  route(
    "POST",
    "/admin/members/:id/tariff",
    staff,
    z.object({
      membership: c.membershipDto,
      cancelledBookingCount: z.number().int(),
    }),
    async ({ params, body, user }) =>
      members.changeMemberTariff(db, params.id, body.tariffId, user.id),
    {
      operationId: "changeTariff",
      params: c.idParams,
      body: c.changeTariffSchema,
    },
  );
  route(
    "POST",
    "/admin/members/:id/credits",
    staff,
    c.creditDto,
    async ({ params, body, user }) =>
      members.grantMemberCredits(db, params.id, body, user.id),
    {
      operationId: "grantCredits",
      status: 201,
      params: c.idParams,
      body: c.grantCreditsSchema,
    },
  );
  route(
    "POST",
    "/admin/members/:id/quota-adjustments",
    staff,
    c.adjustmentDto,
    async ({ params, body, user }) =>
      members.adjustMemberQuota(db, params.id, body, user.id),
    {
      operationId: "adjustQuota",
      status: 201,
      params: c.idParams,
      body: c.quotaAdjustmentSchema,
    },
  );
  route(
    "POST",
    "/admin/members/:id/payment-box",
    staff,
    z.object({ id: c.id, paymentBoxId: c.id.nullable() }),
    async ({ params, body }) =>
      profiles.changePaymentBox(db, params.id, body.paymentBoxId),
    {
      operationId: "changePaymentBox",
      params: c.idParams,
      body: c.paymentBoxSchema,
    },
  );
  route(
    "POST",
    "/admin/members/:id/reset-password",
    staff,
    c.ok,
    async ({ params, body }) => {
      await queries.getPerson(db, params.id, "member");
      return identity.resetAccountPassword(db, params.id, body.password);
    },
    {
      operationId: "resetMemberPassword",
      params: c.idParams,
      body: c.resetPasswordSchema,
    },
  );
  route(
    "POST",
    "/admin/members/:id/deactivate",
    admin,
    changeResult.extend({ status: z.literal("inactive") }),
    async ({ params, user }) =>
      members.deactivateMember(db, params.id, user.id),
    { operationId: "deactivateMember", params: c.idParams },
  );
  route(
    "POST",
    "/admin/members/:id/reactivate",
    admin,
    z.object({ id: c.id, status: z.literal("active") }),
    async ({ params }) => members.reactivateMember(db, params.id),
    { operationId: "reactivateMember", params: c.idParams },
  );
  route(
    "GET",
    "/admin/staff",
    admin,
    z.array(c.staffDto),
    async ({ query }) =>
      queries.listStaff(db, {
        role: query.role,
        status: query.status,
        order: query.order,
      }),
    {
      operationId: "staff",
      query: z.object({
        role: z.enum(["coach", "admin"]).optional(),
        status: z.enum(["active", "inactive"]).optional(),
        order: z.string().optional(),
      }),
    },
  );
  route(
    "POST",
    "/admin/staff",
    admin,
    c.staffDto,
    async ({ body }) => {
      const created = await identity.provisionAccount(db, {
        ...body,
        boxId: await targetBox(undefined, null),
      });
      return queries.getPerson(db, created.id);
    },
    {
      operationId: "createStaff",
      body: c.createStaffSchema.extend({ email: c.emailRequired }),
      status: 201,
    },
  );
  route(
    "GET",
    "/admin/staff/:id",
    admin,
    c.staffDto,
    async ({ params }) => {
      const result = await queries.getPerson(db, params.id);
      if (result.role === "member") throw new DomainError("FORBIDDEN");
      return result;
    },
    { operationId: "staffMember", params: c.idParams },
  );
  route(
    "PATCH",
    "/admin/staff/:id",
    admin,
    c.staffDto,
    async ({ params, body }) => {
      await profiles.patchStaff(db, params.id, body);
      return queries.getPerson(db, params.id);
    },
    {
      operationId: "updateStaff",
      params: c.idParams,
      body: c.patchStaffSchema.safeExtend({
        email: c.emailRequired.optional(),
      }),
    },
  );
  route(
    "GET",
    "/admin/coaches",
    staff,
    z.array(c.coachOption),
    async () => queries.listCoachOptions(db),
    { operationId: "coachOptions" },
  );
  route(
    "GET",
    "/admin/tariffs",
    staff,
    z.array(c.tariffDto),
    async () => catalog.listTariffs(db),
    { operationId: "tariffs" },
  );
  route(
    "POST",
    "/admin/tariffs",
    admin,
    c.tariffDto,
    async ({ body }) => catalog.createTariff(db, body),
    { operationId: "createTariff", body: c.tariffWriteSchema, status: 201 },
  );
  route(
    "PATCH",
    "/admin/tariffs/:id",
    admin,
    c.tariffDto,
    async ({ params, body }) => catalog.updateTariff(db, params.id, body),
    {
      operationId: "updateTariff",
      params: c.idParams,
      body: c.patchTariffSchema,
    },
  );
  const registered = c.page(c.paymentCard).extend({
    totals: z.object({
      count: z.number().int(),
      amountCents: z.number().int(),
    }),
  });
  route(
    "GET",
    "/admin/payments",
    staff,
    registered,
    async ({ query }) =>
      queries.listPaymentsPage(db, {
        boxId: query.box,
        page: query.page,
        order: query.order,
      }),
    { operationId: "payments", query: list },
  );
  route(
    "GET",
    "/admin/members/:id/payments",
    staff,
    registered.extend({ member: c.personDto }),
    async ({ params, query }) => ({
      ...(await queries.listPaymentsPage(db, {
        memberId: params.id,
        page: query.page,
        order: query.order,
      })),
      member: await queries.getPerson(db, params.id, "member"),
    }),
    { operationId: "memberPayments", params: c.idParams, query: list },
  );
  route(
    "POST",
    "/admin/payments",
    staff,
    c.paymentDto,
    async ({ body, user }) => payments.recordPayment(db, body, user.id),
    { operationId: "recordPayment", body: c.createPaymentSchema, status: 201 },
  );
  route(
    "PATCH",
    "/admin/payments/:id",
    staff,
    c.paymentDto,
    async ({ params, body }) => payments.patchPayment(db, params.id, body),
    {
      operationId: "updatePayment",
      params: c.idParams,
      body: c.patchPaymentSchema,
    },
  );
  route(
    "DELETE",
    "/admin/payments/:id",
    staff,
    c.ok,
    async ({ params }) => payments.deletePayment(db, params.id),
    { operationId: "deletePayment", params: c.idParams },
  );
  route(
    "GET",
    "/admin/unpaid",
    staff,
    c.page(c.unpaidDto).extend({ asOf: z.iso.date() }),
    async ({ query }) =>
      queries.listUnpaidPage(
        db,
        query.date,
        query.page,
        query.box,
        query.order,
      ),
    {
      operationId: "unpaid",
      query: list.extend({ date: z.iso.date().optional() }),
    },
  );
  for (const path of ["/boxes", "/admin/boxes"])
    if (path !== "/boxes")
      route(
        "GET",
        path,
        staff,
        z.array(c.boxDto),
        async () => catalog.listBoxes(db),
        { operationId: "adminBoxes" },
      );
  route(
    "POST",
    "/admin/boxes",
    admin,
    c.boxDto,
    async ({ body }) => catalog.createBox(db, body),
    { operationId: "createBox", body: c.createBoxSchema, status: 201 },
  );
  route(
    "PATCH",
    "/admin/boxes/:id",
    admin,
    c.boxDto,
    async ({ params, body }) => catalog.renameBox(db, params.id, body),
    { operationId: "renameBox", params: c.idParams, body: c.createBoxSchema },
  );
  route(
    "GET",
    "/admin/hours",
    staff,
    c.boxHoursConfigSchema,
    async ({ query, user }) =>
      schedule.getBoxHours(
        db,
        await targetBox(query.box, user.preferenceBoxId),
      ),
    { operationId: "hours", query: z.object({ box: c.id.optional() }) },
  );
  route(
    "PATCH",
    "/admin/hours",
    admin,
    c.boxHoursConfigSchema,
    async ({ body, query, user }) =>
      schedule.updateBoxHours(
        db,
        await targetBox(query.box, user.preferenceBoxId),
        body,
      ),
    {
      operationId: "updateHours",
      body: c.boxHoursConfigSchema,
      query: z.object({ box: c.id.optional() }),
    },
  );
  route(
    "GET",
    "/admin/class-types",
    staff,
    z.array(c.typeDto),
    async () =>
      (await catalog.listClassTypes(db)).map((t) => ({
        ...t,
        imageUrl: imageUrl(t.imageKey),
      })),
    { operationId: "classTypes" },
  );
  route(
    "POST",
    "/admin/class-types",
    admin,
    c.typeDto,
    async ({ body, image }) => {
      const row = await catalog.createClassType(db, body, image);
      return { ...row, imageUrl: imageUrl(row.imageKey) };
    },
    {
      operationId: "createClassType",
      body: classForm,
      upload: true,
      status: 201,
    },
  );
  route(
    "PATCH",
    "/admin/class-types/:id",
    admin,
    c.typeDto,
    async ({ params, body, image }) => {
      const [current] = await db
        .select()
        .from(classType)
        .where(eq(classType.id, params.id));
      if (!current) throw new DomainError("FORBIDDEN");
      const row = await catalog.updateClassType(
        db,
        params.id,
        { name: body.name ?? current.name },
        image,
      );
      return { ...row, imageUrl: imageUrl(row.imageKey) };
    },
    {
      operationId: "updateClassType",
      params: c.idParams,
      body: classPatchForm,
      upload: true,
    },
  );
  route(
    "DELETE",
    "/admin/class-types/:id",
    admin,
    c.ok,
    async ({ params }) => catalog.deleteClassType(db, params.id),
    { operationId: "deleteClassType", params: c.idParams },
  );
  route(
    "POST",
    "/me/profile-image",
    all,
    z.object({ imageUrl: z.string() }),
    async ({ user, image }) => {
      if (!image)
        throw new DomainError("FORBIDDEN", "Elegí una foto de perfil");
      return {
        imageUrl: await profiles.saveProfileImage(
          db,
          user.id,
          image.data,
          image.mimeType,
        ),
      };
    },
    {
      operationId: "saveProfileImage",
      body: z.object({ image: file }),
      upload: true,
    },
  );
  route(
    "DELETE",
    "/me/profile-image",
    all,
    c.ok,
    async ({ user }) => {
      await profiles.removeProfileImage(db, user.id);
      return { ok: true };
    },
    { operationId: "removeProfileImage" },
  );
  for (const profile of [true, false])
    app.get(
      profile ? "/api/v1/profile-images/:id" : "/api/v1/class-type-images/:key",
      {
        schema: {
          operationId: profile ? "profileImage" : "classTypeImage",
          security: [{ memberSession: [] }, { staffSession: [] }],
          params: profile
            ? c.idParams
            : z.object({ key: z.string().min(1).max(100) }),
          response: {
            200: z.string().meta({ format: "binary" }),
            401: c.error,
            403: c.error,
            404: c.error,
          },
        },
      },
      async (req, reply) => {
        const user = await auth.principal(req);
        const params = req.params as { id: string; key: string };
        const image = profile
          ? await profiles.readProfileImage(db, user, params.id)
          : (
              await db
                .select()
                .from(classTypeImage)
                .where(eq(classTypeImage.id, params.key))
            )[0];
        if (!image)
          return reply.code(404).send({
            error: { code: "NOT_FOUND", message: "Imagen no encontrada" },
          });
        reply.header("X-Content-Type-Options", "nosniff").type(image.mimeType);
        return reply.send(image.data);
      },
    );
  for (const path of ["/trainings", "/admin/trainings"])
    route(
      "GET",
      path,
      path.startsWith("/admin") ? staff : all,
      c.page(c.trainingListCard),
      async ({ query }) =>
        queries.listTrainingsPage(db, query.type, query.page, query.order),
      {
        operationId: path.startsWith("/admin") ? "staffTrainings" : "trainings",
        query: list,
      },
    );
  route(
    "GET",
    "/trainings/filter-types",
    all,
    z.array(c.typeDto.pick({ id: true, name: true, slug: true, kind: true })),
    async () => queries.listTrainingFilterTypes(db),
    { operationId: "trainingFilterTypes" },
  );
  route(
    "GET",
    "/admin/trainings/options",
    staff,
    z.array(c.trainingOption),
    async ({ query }) => queries.listTrainingOptions(db, query.type),
    {
      operationId: "trainingOptions",
      query: z.object({ type: c.id.optional() }),
    },
  );
  for (const path of ["/trainings/:id", "/admin/trainings/:id"])
    route(
      "GET",
      path,
      path.startsWith("/admin") ? staff : all,
      c.trainingView,
      async ({ params }) => trainingView(db, params.id),
      {
        operationId: path.startsWith("/admin") ? "staffTraining" : "training",
        params: c.idParams,
      },
    );
  route(
    "POST",
    "/admin/trainings",
    staff,
    c.trainingView,
    async ({ body }) =>
      trainingView(db, (await trainings.createTraining(db, body)).id),
    { operationId: "createTraining", body: c.trainingWriteSchema, status: 201 },
  );
  route(
    "PATCH",
    "/admin/trainings/:id",
    staff,
    z.object({ training: c.trainingView, detachedCount: z.number().int() }),
    async ({ params, body }) => {
      const result = await trainings.updateTraining(db, params.id, body);
      return { ...result, training: await trainingView(db, params.id) };
    },
    {
      operationId: "updateTraining",
      params: c.idParams,
      body: c.trainingPatchSchema,
    },
  );
  route(
    "DELETE",
    "/admin/trainings/:id",
    staff,
    c.ok.extend({ detachedCount: z.number().int() }),
    async ({ params, query }) =>
      trainings.deleteTraining(db, params.id, query.confirmDetach === "true"),
    {
      operationId: "deleteTraining",
      params: c.idParams,
      query: z.object({ confirmDetach: z.enum(["true", "false"]).optional() }),
    },
  );
  route(
    "GET",
    "/admin/instances",
    staff,
    c.page(c.exceptionDto),
    async ({ query }) =>
      calendar.listExceptionsPage(db, query.page, query.from),
    {
      operationId: "exceptions",
      query: list.extend({ from: z.iso.date().optional() }),
    },
  );
  route(
    "POST",
    "/admin/instances",
    staff,
    c.identified,
    async ({ body }) => instances.createExtraInstance(db, body),
    {
      operationId: "createExtraClass",
      body: c.createInstanceSchema,
      status: 201,
    },
  );
  route(
    "GET",
    "/admin/instances/:id",
    staff,
    c.staffInstance,
    async ({ params, user }) => staffInstanceView(db, params.id, user),
    { operationId: "staffInstance", params: c.idParams },
  );
  route(
    "PATCH",
    "/admin/instances/:id",
    staff,
    changeResult,
    async ({ params, body, user }) =>
      instances.patchInstance(db, params.id, body, user.id),
    {
      operationId: "updateInstance",
      params: c.idParams,
      body: c.patchInstanceSchema,
    },
  );
  route(
    "DELETE",
    "/admin/instances/:id",
    staff,
    z.object({ deleted: z.boolean(), cancelledBookingCount: z.number().int() }),
    async ({ params, user }) =>
      instances.removeExtraInstance(db, params.id, user.id),
    { operationId: "removeExtraClass", params: c.idParams },
  );
  route(
    "POST",
    "/admin/instances/:id/restore-template",
    staff,
    changeResult,
    async ({ params, user }) =>
      instances.restoreInstanceFromTemplate(db, params.id, user.id),
    { operationId: "restoreInstance", params: c.idParams },
  );
  route(
    "GET",
    "/admin/week",
    staff,
    z.array(c.classDto),
    async ({ query, user }) =>
      calendar.listCalendar(
        db,
        null,
        query.from,
        addDays(query.from, 6),
        await targetBox(query.box, user.preferenceBoxId),
        new Date(),
        true,
      ),
    {
      operationId: "week",
      query: c.adminWeekQuerySchema.extend({ box: c.id.optional() }),
    },
  );
  route(
    "GET",
    "/admin/day",
    staff,
    z.array(c.classDto.extend({ roster: z.array(c.staffRoster) })),
    async ({ query, user }) => {
      const rows = await calendar.listCalendar(
        db,
        null,
        query.date,
        query.date,
        await targetBox(query.box, user.preferenceBoxId),
        new Date(),
        true,
      );
      const roster = await db.execute<{
        instanceId: string;
        bookingId: string;
        userId: string;
        name: string;
        shortName: string;
        phone: string | null;
        profileImageUrl: string | null;
      }>(
        sql`SELECT b.instance_id AS "instanceId",b.id AS "bookingId",u.id AS "userId",u.first_name||' '||u.last_name AS name,u.first_name||' '||left(u.last_name,1)||'.' AS "shortName",u.phone,CASE WHEN img.updated_at IS NULL THEN NULL ELSE '/api/v1/profile-images/'||u.id||'?v='||floor(extract(epoch FROM img.updated_at)*1000)::text END AS "profileImageUrl" FROM booking b JOIN "user" u ON u.id=b.user_id JOIN class_instance i ON i.id=b.instance_id LEFT JOIN user_profile_image img ON img.user_id=u.id WHERE i.date=${query.date}::date AND b.status='active' ORDER BY u.first_name,u.last_name,u.id`,
      );
      return rows.map((row) => ({
        ...row,
        roster: roster.rows.filter((p) => p.instanceId === row.id),
      }));
    },
    {
      operationId: "day",
      query: c.adminDayQuerySchema.extend({ box: c.id.optional() }),
    },
  );
  route(
    "GET",
    "/admin/templates",
    staff,
    z.array(c.templateDto),
    async ({ query, user }) =>
      (
        await templates.listTemplates(
          db,
          await targetBox(query.box, user.preferenceBoxId),
        )
      ).map((r) => ({
        ...r.template,
        kind: r.classType.kind,
        classTypeName: r.classType.name,
        imageUrl: imageUrl(r.classType.imageKey),
      })),
    { operationId: "templates", query: z.object({ box: c.id.optional() }) },
  );
  route(
    "POST",
    "/admin/templates",
    admin,
    c.propagationDto,
    async ({ body, user }) => templates.createTemplate(db, body, user.id),
    { operationId: "createTemplate", body: c.templateWriteSchema, status: 201 },
  );
  route(
    "PATCH",
    "/admin/templates/:id",
    admin,
    c.propagationDto,
    async ({ params, body, user }) =>
      templates.updateTemplate(db, params.id, body, user.id),
    {
      operationId: "updateTemplate",
      params: c.idParams,
      body: c.patchTemplateSchema,
    },
  );
  route(
    "DELETE",
    "/admin/templates/:id",
    admin,
    c.propagationDto,
    async ({ params, user }) =>
      templates.deleteTemplate(db, params.id, user.id),
    { operationId: "deleteTemplate", params: c.idParams },
  );
  route(
    "POST",
    "/admin/templates/apply-draft",
    admin,
    c.propagationDto,
    async ({ body, user }) => templates.applyTemplateDraft(db, body, user.id),
    { operationId: "publishTemplate", body: c.applyTemplateDraftSchema },
  );
}
