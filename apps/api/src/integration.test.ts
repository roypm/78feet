import assert from "node:assert/strict";
import { createApiClient, ApiError } from "@78feet/api-client";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { connect } from "@78feet/db/connection";
import { seed, fixtureIds } from "@78feet/application/seed";
import {
  provisionAccount,
  resetAccountPassword,
} from "@78feet/application/identity";
import { createBox } from "@78feet/application/catalog";
import { createExtraInstance } from "@78feet/application/instances";
import { addDays, localDateString } from "@78feet/domain";
import { buildApi } from "./server.ts";

const url = new URL(process.env.TEST_DATABASE_URL ?? "");
if (
  !["localhost", "127.0.0.1", "db-test"].includes(url.hostname) ||
  url.pathname !== "/feet_test"
)
  throw new Error("API tests require isolated local feet_test");
const connection = connect(url.toString());
const origin = "http://localhost:3000";
const settings = {
  origin,
  memberSecret: "only-local-tests-member-secret-at-least-32-characters",
  staffSecret: "only-local-tests-staff-secret-at-least-32-characters",
  nativeOrigins: ["78feet://"],
};
const app = await buildApi({
  db: connection.db,
  auth: settings,
  loginIpLimit: 10000,
});
try {
  await connection.pool.query(
    "DROP SCHEMA public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public",
  );
  execFileSync("pnpm", ["--filter", "@78feet/db", "migrate"], {
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: "pipe",
  });
  await seed(connection.db, {
    loginId: "admin",
    email: "admin@example.org",
    password: "admin-password",
  });
  const b = await createBox(connection.db, { name: "HTTP test" });
  const accounts = {
    member: await provisionAccount(connection.db, {
      role: "member",
      firstName: "Socio",
      lastName: "Local",
      loginId: "12345678Z",
      email: "shared@example.org",
      password: "member-password",
      boxId: b.id,
      tariffId: fixtureIds.tariff,
    }),
    coach: await provisionAccount(connection.db, {
      role: "coach",
      firstName: "Coach",
      lastName: "Local",
      dni: "12345678Z",
      loginId: "coach",
      email: "shared@example.org",
      password: "coach-password",
      boxId: b.id,
    }),
    admin: { id: fixtureIds.admin, role: "admin" },
  };
  const send = async (
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    payload?: unknown,
    cookie?: string,
  ) =>
    app.inject({
      method,
      url: "/api/v1" + path,
      headers: {
        origin,
        ...(cookie ? { cookie } : {}),
        ...(payload === undefined
          ? {}
          : { "content-type": "application/json" }),
      },
      ...(payload === undefined ? {} : { payload: JSON.stringify(payload) }),
    });
  const login = async (
    access: "member" | "staff",
    loginId: string,
    password: string,
  ) => {
    const response = await send("POST", "/auth/login", {
      access,
      loginId,
      password,
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(Object.hasOwn(response.json(), "token"), false);
    const headers = response.headers["set-cookie"];
    const values = Array.isArray(headers) ? headers : headers ? [headers] : [];
    assert.ok(values.every((value) => value.includes("HttpOnly")));
    const cookie = values.map((value) => value.split(";")[0]).join("; ");
    assert.ok(cookie);
    return cookie;
  };
  const cookies = {
    member: await login("member", "12345678Z", "member-password"),
    coach: await login("staff", "coach", "coach-password"),
    admin: await login("staff", "admin", "admin-password"),
  };
  for (const role of ["member", "coach", "admin"] as const) {
    const me = await send("GET", "/auth/me", undefined, cookies[role]);
    assert.equal(me.statusCode, 200, me.body);
    assert.equal(me.json().user.role, role);
    const profile = await send("GET", "/me/profile", undefined, cookies[role]);
    assert.equal(profile.statusCode, 200, profile.body);
    for (const field of [
      "password",
      "passwordHash",
      "authUserId",
      "tokenVersion",
      "failedLogins",
      "lockedUntil",
    ])
      assert.equal(Object.hasOwn(profile.json(), field), false, field);
  }
  assert.equal((await send("GET", "/me/profile")).statusCode, 401);
  assert.equal(
    (
      await send(
        "GET",
        "/me/profile",
        undefined,
        "feet-member.session_token=malformed",
      )
    ).statusCode,
    401,
  );
  assert.equal(
    (
      await send(
        "GET",
        "/me/profile",
        undefined,
        cookies.member + "; " + cookies.coach,
      )
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await app.inject({
        method: "PATCH",
        url: "/api/v1/me/preferences",
        headers: { cookie: cookies.member, origin: "https://evil.example" },
        payload: { theme: "dark" },
      })
    ).statusCode,
    403,
  );
  for (const realm of ["member", "staff"])
    for (const path of [
      "sign-in/email",
      "sign-up/email",
      "request-password-reset",
      "reset-password",
      "send-verification-email",
      "verify-email",
      "change-email",
    ])
      assert.equal(
        (await send("POST", `/auth/${realm}/${path}`, {})).statusCode,
        404,
        path,
      );
  assert.equal(
    (
      await send("POST", "/auth/login", {
        access: "member",
        loginId: "shared@example.org",
        password: "member-password",
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await send("POST", "/auth/login", {
        access: "member",
        loginId: "12345678Z",
        password: "member-password",
        role: "admin",
      })
    ).statusCode,
    400,
  );
  console.log(
    "PASS HTTP: Better Auth cookies, real roles, private fields, malformed/ambiguous session, CSRF and disabled email/signup paths",
  );
  const date = addDays(localDateString(new Date()), 7);
  const instance = await createExtraInstance(connection.db, {
    boxId: b.id,
    classTypeId: fixtureIds.type,
    date,
    startTime: "10:00",
    endTime: "11:00",
    capacity: 1,
  });
  const gets = [
    ["/boxes", cookies.member],
    ["/boxes/" + b.id + "/hours", cookies.member],
    ["/me/summary", cookies.member],
    ["/me/bookings", cookies.member],
    ["/me/bookings/history", cookies.member],
    ["/calendar?from=" + date + "&to=" + date + "&box=" + b.id, cookies.member],
    ["/instances/" + instance.id, cookies.member],
    ["/admin/instances/" + instance.id, cookies.coach],
    ["/admin/members", cookies.coach],
    ["/admin/members/options", cookies.coach],
    ["/admin/members/" + accounts.member.id, cookies.coach],
    ["/admin/members/" + accounts.member.id + "/summary", cookies.coach],
    ["/admin/members/" + accounts.member.id + "/payments", cookies.coach],
    ["/admin/staff", cookies.admin],
    ["/admin/staff/" + accounts.coach.id, cookies.admin],
    ["/admin/coaches", cookies.coach],
    ["/admin/tariffs", cookies.coach],
    ["/admin/payments", cookies.coach],
    ["/admin/unpaid", cookies.coach],
    ["/admin/boxes", cookies.coach],
    ["/admin/hours?box=" + b.id, cookies.coach],
    ["/admin/class-types", cookies.coach],
    ["/trainings", cookies.member],
    ["/trainings/filter-types", cookies.member],
    ["/admin/trainings", cookies.coach],
    ["/admin/trainings/options", cookies.coach],
    ["/admin/instances", cookies.coach],
    ["/admin/week?from=" + date + "&box=" + b.id, cookies.coach],
    ["/admin/day?date=" + date + "&box=" + b.id, cookies.coach],
    ["/admin/templates?box=" + b.id, cookies.coach],
  ];
  for (const [path, cookie] of gets) {
    const response = await send("GET", path, undefined, cookie);
    assert.equal(response.statusCode, 200, `${path}: ${response.body}`);
  }
  const reserved = await send(
    "POST",
    "/bookings",
    { instanceId: instance.id },
    cookies.member,
  );
  assert.equal(reserved.statusCode, 201, reserved.body);
  const upcoming = await send("GET", "/me/bookings", undefined, cookies.member);
  assert.equal(upcoming.statusCode, 200, upcoming.body);
  assert.equal(upcoming.json().items.length, 1);
  const cancelled = await send(
    "DELETE",
    "/bookings/" + reserved.json().id,
    undefined,
    cookies.member,
  );
  assert.equal(cancelled.statusCode, 200, cancelled.body);
  const bookAgain = await send(
    "POST",
    "/admin/bookings",
    { instanceId: instance.id, userId: accounts.member.id },
    cookies.coach,
  );
  assert.equal(bookAgain.statusCode, 201, bookAgain.body);
  const cancelClass = await send(
    "PATCH",
    "/admin/instances/" + instance.id,
    { status: "cancelled" },
    cookies.coach,
  );
  assert.equal(cancelClass.statusCode, 200, cancelClass.body);
  const future = await send("GET", "/me/bookings", undefined, cookies.member);
  assert.equal(future.statusCode, 200, future.body);
  assert.equal(future.json().items[0].boxCancelled, true);
  console.log(
    "PASS HTTP: all initial read projections, own/staff booking, cancellation and future box-cancelled bookings",
  );
  const document = app.swagger();
  const baseline = JSON.parse(
    await readFile(new URL("./r0-operations.json", import.meta.url), "utf8"),
  ) as { method: string; path: string; roles: string }[];
  const normal = (path: string) => path.replace(/\[[^\]]+\]|\{[^}]+\}/g, "{}");
  const published = Object.entries(document.paths ?? {}).flatMap(
    ([path, item]) =>
      Object.entries(item ?? {})
        .filter(([method]) =>
          ["get", "post", "patch", "put", "delete"].includes(method),
        )
        .map(([method, operation]) => ({
          method: method.toUpperCase(),
          path,
          operation: operation as {
            description?: string;
            operationId?: string;
          },
        })),
  );
  for (const expected of baseline) {
    if (expected.path.includes("/cron/")) {
      assert.equal(
        (await send(expected.method as "GET", "/cron/materialize", {}))
          .statusCode,
        404,
      );
      continue;
    }
    assert.ok(
      published.some(
        (actual) =>
          actual.method === expected.method &&
          normal(actual.path) === normal(expected.path),
      ),
      expected.method + " " + expected.path,
    );
  }
  let denied = 0;
  for (const entry of published) {
    if (!entry.operation.description?.startsWith("Roles: ")) continue;
    const allowed = entry.operation.description.slice(7).split(", ");
    const path = entry.path
      .replace("/api/v1", "")
      .replace(/\{[^}]+\}/g, "00000000-0000-4000-8000-000000000099");
    assert.equal(
      (await send(entry.method as "GET", path, undefined)).statusCode,
      401,
      "anonymous " + entry.method + " " + path,
    );
    for (const role of ["member", "coach", "admin"] as const)
      if (!allowed.includes(role)) {
        const response = await send(
          entry.method as "GET",
          path,
          {},
          cookies[role],
        );
        assert.equal(
          response.statusCode,
          403,
          role + " " + entry.method + " " + path + ": " + response.body,
        );
        denied++;
      }
  }
  assert.ok(denied > 50);
  console.log(
    "PASS HTTP: R0 operations covered, cron absent, anonymous and excluded-role matrix (" +
      denied +
      " denials)",
  );
  const created = await send(
    "POST",
    "/admin/members",
    {
      dni: "87654321X",
      password: "other-password",
      firstName: "Otra",
      lastName: "Persona",
      email: "other@example.org",
      tariffId: fixtureIds.tariff,
      paymentBoxId: b.id,
    },
    cookies.coach,
  );
  assert.equal(created.statusCode, 201, created.body);
  const other = created.json();
  const otherCookie = await login("member", "87654321X", "other-password");
  const multipart = async (
    path: string,
    cookie: string,
    fields: Record<string, string>,
    bytes?: Buffer,
  ) => {
    const boundary = "feet-test-boundary";
    const parts: Buffer[] = [];
    for (const [key, value] of Object.entries(fields))
      parts.push(
        Buffer.from(
          "--" +
            boundary +
            '\r\nContent-Disposition: form-data; name="' +
            key +
            '"\r\n\r\n' +
            value +
            "\r\n",
        ),
      );
    if (bytes)
      parts.push(
        Buffer.from(
          "--" +
            boundary +
            '\r\nContent-Disposition: form-data; name="image"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n',
        ),
        bytes,
        Buffer.from("\r\n"),
      );
    parts.push(Buffer.from("--" + boundary + "--\r\n"));
    return app.inject({
      method: "POST",
      url: "/api/v1" + path,
      headers: {
        origin,
        cookie,
        "content-type": "multipart/form-data; boundary=" + boundary,
      },
      payload: Buffer.concat(parts),
    });
  };
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const image = await multipart("/me/profile-image", cookies.member, {}, png);
  assert.equal(image.statusCode, 200, image.body);
  assert.equal(
    (
      await send(
        "GET",
        "/profile-images/" + accounts.member.id,
        undefined,
        cookies.member,
      )
    ).statusCode,
    200,
  );
  assert.equal(
    (
      await send(
        "GET",
        "/profile-images/" + accounts.member.id,
        undefined,
        otherCookie,
      )
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await send(
        "GET",
        "/profile-images/" + accounts.member.id,
        undefined,
        cookies.coach,
      )
    ).statusCode,
    200,
  );
  assert.equal(
    (
      await multipart(
        "/me/profile-image",
        cookies.member,
        {},
        Buffer.from("not-an-image"),
      )
    ).statusCode,
    400,
  );
  assert.equal(
    (await send("DELETE", "/me/profile-image", undefined, cookies.member))
      .statusCode,
    200,
  );
  const newType = await multipart(
    "/admin/class-types",
    cookies.admin,
    { name: "HTTP dirigida", kind: "directed" },
    png,
  );
  assert.equal(newType.statusCode, 201, newType.body);
  assert.equal(
    (
      await send(
        "GET",
        newType.json().imageUrl.replace("/api/v1", ""),
        undefined,
        cookies.member,
      )
    ).statusCode,
    200,
  );
  const training = await send(
    "POST",
    "/admin/trainings",
    {
      name: "HTTP rutina",
      classTypeId: newType.json().id,
      phases: [{ name: "Calentar", blocks: [{ body: "Movilidad" }] }],
    },
    cookies.coach,
  );
  assert.equal(training.statusCode, 201, training.body);
  assert.equal(
    (
      await send(
        "GET",
        "/trainings/" + training.json().id,
        undefined,
        cookies.member,
      )
    ).statusCode,
    200,
  );
  assert.equal(
    (
      await send(
        "PATCH",
        "/admin/trainings/" + training.json().id,
        { name: "HTTP rutina editada" },
        cookies.coach,
      )
    ).statusCode,
    200,
  );
  const newBox = await send(
    "POST",
    "/admin/boxes",
    { name: "HTTP sede nueva" },
    cookies.admin,
  );
  assert.equal(newBox.statusCode, 201, newBox.body);
  assert.equal(
    (
      await send(
        "PATCH",
        "/admin/boxes/" + newBox.json().id,
        { name: "HTTP sede renombrada" },
        cookies.admin,
      )
    ).statusCode,
    200,
  );
  const preferences = await send(
    "PATCH",
    "/me/preferences",
    { theme: "dark", preferenceBoxId: b.id },
    cookies.member,
  );
  assert.equal(preferences.statusCode, 200, preferences.body);
  const pay = await send(
    "POST",
    "/admin/payments",
    {
      userId: accounts.member.id,
      billingPeriod: "monthly",
      periodStart: localDateString(new Date()),
      amountCents: 5000,
      method: "cash",
    },
    cookies.coach,
  );
  assert.equal(pay.statusCode, 201, pay.body);
  const payList = await send(
    "GET",
    "/admin/payments",
    undefined,
    cookies.coach,
  );
  assert.equal(payList.statusCode, 200, payList.body);
  assert.equal(payList.json().items.length, 1);
  const memberPayList = await send(
    "GET",
    "/admin/members/" + accounts.member.id + "/payments",
    undefined,
    cookies.coach,
  );
  assert.equal(memberPayList.statusCode, 200, memberPayList.body);
  assert.equal(
    (
      await send(
        "PATCH",
        "/admin/payments/" + pay.json().id,
        { amountCents: 4900 },
        cookies.coach,
      )
    ).statusCode,
    200,
  );
  assert.equal(
    (
      await send(
        "DELETE",
        "/admin/payments/" + pay.json().id,
        undefined,
        cookies.coach,
      )
    ).statusCode,
    200,
  );
  const credits = await send(
    "POST",
    "/admin/members/" + accounts.member.id + "/credits",
    { quantity: 2 },
    cookies.coach,
  );
  assert.equal(credits.statusCode, 201, credits.body);
  const adjusted = await send(
    "POST",
    "/admin/members/" + accounts.member.id + "/quota-adjustments",
    { kind: "directed", delta: 1 },
    cookies.coach,
  );
  assert.equal(adjusted.statusCode, 201, adjusted.body);
  const tariff = await send(
    "POST",
    "/admin/tariffs",
    {
      name: "HTTP semanal",
      priceCents: 5000,
      consumptionModel: "weekly_quota",
      billingPeriod: "monthly",
      quotaDirected: 3,
      quotaOpen: 0,
    },
    cookies.admin,
  );
  assert.equal(tariff.statusCode, 201, tariff.body);
  assert.equal(
    (
      await send(
        "PATCH",
        "/admin/tariffs/" + tariff.json().id,
        { name: "HTTP semanal editada" },
        cookies.admin,
      )
    ).statusCode,
    200,
  );
  const changed = await send(
    "POST",
    "/admin/members/" + accounts.member.id + "/tariff",
    { tariffId: tariff.json().id },
    cookies.coach,
  );
  assert.equal(changed.statusCode, 200, changed.body);
  assert.equal(
    (
      await send(
        "POST",
        "/admin/members/" + accounts.member.id + "/payment-box",
        { paymentBoxId: newBox.json().id },
        cookies.coach,
      )
    ).statusCode,
    200,
  );
  assert.equal(
    (
      await send(
        "PATCH",
        "/admin/members/" + accounts.member.id,
        { phone: "600000000" },
        cookies.coach,
      )
    ).statusCode,
    200,
  );
  const team = await send(
    "POST",
    "/admin/staff",
    {
      loginId: "new-coach",
      password: "new-coach-password",
      role: "coach",
      dni: "12345678Z",
      firstName: "Equipo",
      lastName: "Nuevo",
      email: "new-coach@example.org",
    },
    cookies.admin,
  );
  assert.equal(team.statusCode, 201, team.body);
  const newCoachCookie = await login(
    "staff",
    "new-coach",
    "new-coach-password",
  );
  assert.equal(
    (
      await send(
        "PATCH",
        "/admin/staff/" + team.json().id,
        { status: "inactive" },
        cookies.admin,
      )
    ).statusCode,
    200,
  );
  assert.equal(
    (await send("GET", "/auth/me", undefined, newCoachCookie)).statusCode,
    401,
  );
  const reset = await send(
    "POST",
    "/admin/members/" + accounts.member.id + "/reset-password",
    { password: "changed-password" },
    cookies.coach,
  );
  assert.equal(reset.statusCode, 200, reset.body);
  assert.equal(
    (await send("GET", "/auth/me", undefined, cookies.member)).statusCode,
    401,
  );
  cookies.member = await login("member", "12345678Z", "changed-password");
  assert.equal(
    (await send("GET", "/auth/me", undefined, cookies.coach)).statusCode,
    200,
  );
  const failedLogins = await Promise.all(
    Array.from({ length: 12 }, () =>
      send("POST", "/auth/login", {
        access: "member",
        loginId: "12345678Z",
        password: "wrong-password",
      }),
    ),
  );
  assert.ok(failedLogins.every((r) => r.statusCode === 403));
  assert.equal(
    (
      await connection.pool.query(
        'SELECT failed_logins FROM "user" WHERE id=$1',
        [accounts.member.id],
      )
    ).rows[0].failed_logins,
    10,
  );
  assert.equal(
    (
      await send("POST", "/auth/login", {
        access: "member",
        loginId: "12345678Z",
        password: "changed-password",
      })
    ).json().error.code,
    "ACCOUNT_LOCKED",
  );
  await resetAccountPassword(
    connection.db,
    accounts.member.id,
    "changed-password",
  );
  cookies.member = await login("member", "12345678Z", "changed-password");
  assert.equal(
    (
      await send(
        "POST",
        "/admin/members/" + accounts.member.id + "/deactivate",
        undefined,
        cookies.admin,
      )
    ).statusCode,
    200,
  );
  assert.equal(
    (await send("GET", "/auth/me", undefined, cookies.member)).statusCode,
    401,
  );
  assert.equal(
    (
      await send("POST", "/auth/login", {
        access: "member",
        loginId: "12345678Z",
        password: "changed-password",
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await send(
        "POST",
        "/admin/members/" + accounts.member.id + "/reactivate",
        undefined,
        cookies.admin,
      )
    ).statusCode,
    200,
  );
  const native = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { origin: "78feet://" },
    payload: {
      access: "member",
      loginId: "12345678Z",
      password: "changed-password",
    },
  });
  assert.equal(native.statusCode, 200, native.body);
  assert.ok(native.headers["set-cookie"]);
  assert.equal(Object.hasOwn(native.json(), "token"), false);

  const validNativeCookie = (
    Array.isArray(native.headers["set-cookie"])
      ? native.headers["set-cookie"]
      : [native.headers["set-cookie"]!]
  )
    .map((v) => v.split(";")[0])
    .join("; ");
  const reassigned = await send(
    "POST",
    "/admin/members/" + accounts.member.id + "/tariff",
    { tariffId: tariff.json().id },
    cookies.coach,
  );
  assert.equal(reassigned.statusCode, 200, reassigned.body);
  const httpClass = await send(
    "POST",
    "/admin/instances",
    {
      boxId: b.id,
      date,
      startTime: "12:00",
      endTime: "13:00",
      classTypeId: newType.json().id,
      capacity: 2,
    },
    cookies.coach,
  );
  assert.equal(httpClass.statusCode, 201, httpClass.body);
  assert.equal(
    (
      await send(
        "PATCH",
        "/admin/instances/" + httpClass.json().id,
        { trainingId: training.json().id },
        cookies.coach,
      )
    ).statusCode,
    200,
  );
  const deleteLinked = await send(
    "DELETE",
    "/admin/trainings/" + training.json().id,
    undefined,
    cookies.coach,
  );
  assert.equal(deleteLinked.statusCode, 409, deleteLinked.body);
  assert.equal(deleteLinked.json().detachCount, 1);
  assert.equal(
    (
      await send(
        "DELETE",
        "/admin/trainings/" + training.json().id + "?confirmDetach=true",
        undefined,
        cookies.coach,
      )
    ).statusCode,
    200,
  );
  assert.equal(
    (
      await send(
        "DELETE",
        "/admin/instances/" + httpClass.json().id,
        undefined,
        cookies.coach,
      )
    ).statusCode,
    200,
  );
  const hours = await send(
    "GET",
    "/boxes/" + newBox.json().id + "/hours",
    undefined,
    cookies.admin,
  );
  assert.equal(hours.statusCode, 200, hours.body);
  assert.equal(
    (
      await send(
        "PATCH",
        "/admin/hours?box=" + newBox.json().id,
        hours.json(),
        cookies.admin,
      )
    ).statusCode,
    200,
  );
  const draft = await send(
    "POST",
    "/admin/templates/apply-draft",
    {
      boxId: newBox.json().id,
      deletedIds: [],
      updated: [],
      created: [
        {
          weekday: 1,
          startTime: "09:00",
          endTime: "10:00",
          classTypeId: fixtureIds.type,
          defaultCapacity: 4,
        },
      ],
    },
    cookies.admin,
  );
  assert.equal(draft.statusCode, 200, draft.body);
  const templateList = await send(
    "GET",
    "/admin/templates?box=" + newBox.json().id,
    undefined,
    cookies.coach,
  );
  assert.equal(templateList.statusCode, 200, templateList.body);
  const templateId = templateList.json()[0].id;
  assert.equal(
    (
      await send(
        "PATCH",
        "/admin/templates/" + templateId,
        { defaultCapacity: 5 },
        cookies.admin,
      )
    ).statusCode,
    200,
  );
  const generated = (
    await connection.pool.query(
      "SELECT id FROM class_instance WHERE template_id=$1 AND start_at>now() ORDER BY start_at LIMIT 1",
      [templateId],
    )
  ).rows[0].id;
  assert.equal(
    (
      await send(
        "PATCH",
        "/admin/instances/" + generated,
        { capacity: 6 },
        cookies.coach,
      )
    ).statusCode,
    200,
  );
  const restored = await send(
    "POST",
    "/admin/instances/" + generated + "/restore-template",
    undefined,
    cookies.coach,
  );
  assert.equal(restored.statusCode, 200, restored.body);
  assert.equal(
    (
      await send(
        "DELETE",
        "/admin/templates/" + templateId,
        undefined,
        cookies.admin,
      )
    ).statusCode,
    200,
  );
  const standalone = await send(
    "POST",
    "/admin/templates",
    {
      boxId: newBox.json().id,
      weekday: 2,
      startTime: "09:00",
      endTime: "10:00",
      classTypeId: fixtureIds.type,
      defaultCapacity: 4,
    },
    cookies.admin,
  );
  assert.equal(standalone.statusCode, 201, standalone.body);
  const concurrentTariff = await send(
    "POST",
    "/admin/tariffs",
    {
      name: "HTTP carrera",
      consumptionModel: "weekly_quota",
      billingPeriod: "none",
      priceCents: 0,
      quotaDirected: 1,
      quotaOpen: 0,
    },
    cookies.admin,
  );
  assert.equal(concurrentTariff.statusCode, 201, concurrentTariff.body);
  for (const id of [accounts.member.id, other.id])
    assert.equal(
      (
        await send(
          "POST",
          "/admin/members/" + id + "/tariff",
          { tariffId: concurrentTariff.json().id },
          cookies.coach,
        )
      ).statusCode,
      200,
    );
  const raceClass = await createExtraInstance(connection.db, {
    boxId: b.id,
    date,
    startTime: "13:00",
    endTime: "14:00",
    classTypeId: fixtureIds.type,
    capacity: 1,
  });
  const seats = await Promise.all([
    send("POST", "/bookings", { instanceId: raceClass.id }, validNativeCookie),
    send("POST", "/bookings", { instanceId: raceClass.id }, otherCookie),
  ]);
  assert.equal(seats.filter((r) => r.statusCode === 201).length, 1);
  assert.equal(seats.filter((r) => r.json().error?.code === "FULL").length, 1);
  const seatWinner = seats.find((r) => r.statusCode === 201)!;
  assert.equal(
    (
      await send(
        "DELETE",
        "/admin/bookings/" + seatWinner.json().id,
        undefined,
        cookies.coach,
      )
    ).statusCode,
    200,
  );
  const secondRace = await createExtraInstance(connection.db, {
    boxId: b.id,
    date,
    startTime: "14:00",
    endTime: "15:00",
    classTypeId: fixtureIds.type,
    capacity: 10,
  });
  const beforeQuota = await send(
    "GET",
    "/me/summary",
    undefined,
    validNativeCookie,
  );
  const extraCredits = beforeQuota.json().quota.packBalance;
  if (extraCredits > 0)
    assert.equal(
      (
        await send(
          "POST",
          "/admin/members/" + accounts.member.id + "/credits",
          { quantity: -extraCredits },
          cookies.coach,
        )
      ).statusCode,
      201,
    );
  const quotaRace = await Promise.all([
    send("POST", "/bookings", { instanceId: raceClass.id }, validNativeCookie),
    send("POST", "/bookings", { instanceId: secondRace.id }, validNativeCookie),
  ]);
  assert.equal(quotaRace.filter((r) => r.statusCode === 201).length, 1);
  assert.equal(
    quotaRace.filter((r) => r.json().error?.code === "QUOTA_EXHAUSTED").length,
    1,
  );
  assert.equal(
    (
      await send(
        "DELETE",
        "/admin/bookings/" +
          quotaRace.find((r) => r.statusCode === 201)!.json().id,
        undefined,
        cookies.coach,
      )
    ).statusCode,
    200,
  );
  assert.equal(
    (
      await send(
        "PATCH",
        "/admin/tariffs/" + concurrentTariff.json().id,
        { quotaDirected: 0 },
        cookies.admin,
      )
    ).statusCode,
    200,
  );
  assert.equal(
    (
      await send(
        "POST",
        "/admin/members/" + other.id + "/credits",
        { quantity: 1 },
        cookies.coach,
      )
    ).statusCode,
    201,
  );
  const packRace = await Promise.all([
    send("POST", "/bookings", { instanceId: raceClass.id }, otherCookie),
    send("POST", "/bookings", { instanceId: secondRace.id }, otherCookie),
  ]);
  assert.equal(packRace.filter((r) => r.statusCode === 201).length, 1);
  assert.equal(
    packRace.filter((r) => r.json().error?.code === "QUOTA_EXHAUSTED").length,
    1,
  );
  const packSummary = await send("GET", "/me/summary", undefined, otherCookie);
  assert.equal(packSummary.json().quota.packBalance, 0);
  const logout = await send("POST", "/auth/logout", undefined, otherCookie);
  assert.equal(logout.statusCode, 200, logout.body);
  assert.equal(
    (await send("GET", "/auth/me", undefined, otherCookie)).statusCode,
    401,
  );
  console.log(
    "PASS HTTP: hours, template publication/restore, linked training confirmation, last seat/quota/pack races and server-side logout",
  );

  const client = createApiClient({
    baseUrl: origin,
    headers: { cookie: cookies.admin, origin },
    fetch: async (request) => {
      request.signal.throwIfAborted();
      const body = Buffer.from(await request.arrayBuffer());
      const response = await app.inject({
        method: request.method as "GET",
        url: new URL(request.url).pathname + new URL(request.url).search,
        headers: Object.fromEntries(request.headers),
        ...(body.length ? { payload: body } : {}),
      });
      return new Response(response.body, {
        status: response.statusCode,
        headers: response.headers as Record<string, string>,
      });
    },
  });
  assert.ok((await client.GET("/api/v1/boxes")).data?.length);
  const clientUpload = await client.POST("/api/v1/me/profile-image", {
    body: { image: new Blob([Uint8Array.from(png)], { type: "image/png" }) },
  });
  assert.ok(clientUpload.data?.imageUrl);
  assert.equal(
    (
      await client.POST("/api/v1/admin/class-types", {
        body: { name: "Cliente sin imagen", kind: "open" },
      })
    ).response.status,
    201,
  );
  const aborted = new AbortController();
  aborted.abort();
  await assert.rejects(client.GET("/api/v1/boxes", { signal: aborted.signal }));
  let mutationRequests = 0;
  const failingClient = createApiClient({
    baseUrl: origin,
    fetch: async () => {
      mutationRequests++;
      return new Response(
        JSON.stringify({ error: { code: "FULL", message: "Clase completa" } }),
        { status: 409, headers: { "content-type": "application/json" } },
      );
    },
  });
  await assert.rejects(
    failingClient.POST("/api/v1/bookings", {
      body: { instanceId: instance.id },
    }),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 409 &&
      error.code === "FULL",
  );
  assert.equal(mutationRequests, 1, "mutations are not retried");
  const limited = await buildApi({
    db: connection.db,
    auth: settings,
    loginIpLimit: 1,
  });
  try {
    const attempt = () =>
      limited.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        headers: { origin },
        payload: { access: "member", loginId: "unknown", password: "wrong" },
      });
    assert.equal((await attempt()).statusCode, 403);
    const blocked = await attempt();
    assert.equal(blocked.statusCode, 429);
    assert.ok(blocked.headers["retry-after"]);
  } finally {
    await limited.close();
  }
  const independentTemplate = (
    await connection.pool.query(
      "INSERT INTO class_template(weekday,start_time,end_time,default_capacity,class_type_id,box_id) VALUES(5,'17:00','18:00',4,$1,$2) RETURNING id",
      [fixtureIds.type, newBox.json().id],
    )
  ).rows[0].id;
  const beforeWorker = (
    await connection.pool.query("SELECT count(*)::int n FROM class_instance")
  ).rows[0].n;
  const workerEnv = { ...process.env, DATABASE_URL: url.toString() };
  const lease = await connection.pool.connect();
  try {
    await lease.query("SELECT pg_advisory_lock(78,40)");
    const standby = execFileSync(
      "pnpm",
      ["--filter", "@78feet/worker", "once"],
      { env: workerEnv, encoding: "utf8", timeout: 30000 },
    );
    assert.ok(
      !standby.includes('"event":"materialized"'),
      "a second worker does not schedule while the lease is owned",
    );
  } finally {
    await lease.query("SELECT pg_advisory_unlock(78,40)");
    lease.release();
  }
  execFileSync("pnpm", ["--filter", "@78feet/worker", "once"], {
    env: workerEnv,
    stdio: "pipe",
    timeout: 30000,
  });
  const afterFirstWorker = (
    await connection.pool.query("SELECT count(*)::int n FROM class_instance")
  ).rows[0].n;
  assert.ok(afterFirstWorker > beforeWorker);
  assert.ok(
    (
      await connection.pool.query(
        "SELECT count(*)::int n FROM class_instance WHERE template_id=$1",
        [independentTemplate],
      )
    ).rows[0].n > 0,
    "worker materializes a DB-only template without HTTP",
  );
  execFileSync("pnpm", ["--filter", "@78feet/worker", "once"], {
    env: workerEnv,
    stdio: "pipe",
    timeout: 30000,
  });
  assert.equal(
    (await connection.pool.query("SELECT count(*)::int n FROM class_instance"))
      .rows[0].n,
    afterFirstWorker,
    "worker restart/replay is idempotent",
  );

  const loginReset = await Promise.all([
    send("POST", "/auth/login", {
      access: "member",
      loginId: "87654321X",
      password: "other-password",
    }),
    send(
      "POST",
      "/admin/members/" + other.id + "/reset-password",
      { password: "race-new-password" },
      cookies.coach,
    ),
  ]);
  assert.equal(loginReset[1].statusCode, 200);
  assert.ok([200, 403].includes(loginReset[0].statusCode));
  const responseCookie = (response: typeof native) => {
    const values = response.headers["set-cookie"];
    return (Array.isArray(values) ? values : values ? [values] : [])
      .map((v) => v.split(";")[0])
      .join("; ");
  };
  if (loginReset[0].statusCode === 200)
    assert.equal(
      (await send("GET", "/auth/me", undefined, responseCookie(loginReset[0])))
        .statusCode,
      401,
      "reset revokes a concurrent old-password login",
    );
  const loginDisable = await Promise.all([
    send("POST", "/auth/login", {
      access: "member",
      loginId: "87654321X",
      password: "race-new-password",
    }),
    send(
      "POST",
      "/admin/members/" + other.id + "/deactivate",
      undefined,
      cookies.admin,
    ),
  ]);
  assert.equal(loginDisable[1].statusCode, 200);
  assert.ok([200, 403].includes(loginDisable[0].statusCode));
  if (loginDisable[0].statusCode === 200)
    assert.equal(
      (
        await send(
          "GET",
          "/auth/me",
          undefined,
          responseCookie(loginDisable[0]),
        )
      ).statusCode,
      401,
      "deactivation revokes a concurrent login",
    );
  assert.equal(
    (
      await connection.pool.query(
        `SELECT count(*)::int n FROM member_auth_session s JOIN "user" u ON u.auth_user_id=s.user_id AND u.auth_realm='member' WHERE u.id=$1`,
        [other.id],
      )
    ).rows[0].n,
    0,
  );
  const expiry = (
    await connection.pool.query(
      `SELECT s.id,s.expires_at,extract(epoch FROM (s.expires_at-s.created_at))::int seconds FROM member_auth_session s JOIN "user" u ON u.auth_user_id=s.user_id AND u.auth_realm='member' WHERE u.id=$1 ORDER BY s.created_at DESC LIMIT 1`,
      [accounts.member.id],
    )
  ).rows[0];
  assert.ok(expiry.seconds > 89 * 86400 && expiry.seconds <= 90 * 86400);
  await connection.pool.query(
    "UPDATE member_auth_session SET updated_at=now()-interval '2 days' WHERE id=$1",
    [expiry.id],
  );
  assert.equal(
    (await send("GET", "/auth/me", undefined, validNativeCookie)).statusCode,
    200,
  );
  assert.equal(
    (
      await connection.pool.query(
        "SELECT expires_at FROM member_auth_session WHERE id=$1",
        [expiry.id],
      )
    ).rows[0].expires_at.getTime(),
    expiry.expires_at.getTime(),
    "session lifetime does not slide",
  );
  const secure = await buildApi({
    db: connection.db,
    auth: { ...settings, origin: "https://feet.example.org" },
  });
  try {
    const response = await secure.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { origin: "https://feet.example.org" },
      payload: {
        access: "staff",
        loginId: "admin",
        password: "admin-password",
      },
    });
    assert.equal(response.statusCode, 200, response.body);
    const cookie = responseCookie(response);
    assert.ok(cookie.includes("__Secure-"));
    assert.ok(String(response.headers["set-cookie"]).includes("Secure"));
  } finally {
    await secure.close();
  }
  const unavailable = await buildApi({
    db: new Proxy(connection.db, {
      get(target, key) {
        if (key === "execute")
          return async () => {
            throw new Error("offline");
          };
        return Reflect.get(target, key);
      },
    }),
    auth: settings,
  });
  try {
    assert.equal((await unavailable.inject("/api/v1/health")).statusCode, 200);
    assert.equal((await unavailable.inject("/api/v1/ready")).statusCode, 503);
  } finally {
    await unavailable.close();
  }
  console.log(
    "PASS auth/availability: concurrent reset/login and deactivation/login, 90-day absolute expiry, Secure cookie on HTTPS and DB readiness",
  );
  console.log(
    "PASS transport/operation: generated client, abort, stable errors, no mutation retry, IP limit, worker lease and independent process replay",
  );
  console.log(
    "PASS HTTP: multipart/private images, all management areas, independent revocation, concurrent failure limit, reset, deactivation/reactivation and native cookie channel",
  );
} finally {
  await app.close();
  await connection.close();
}
