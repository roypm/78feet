import assert from "node:assert/strict";
process.loadEnvFile("infra/local.env");
const env = process.env;
const origin = env.PUBLIC_ORIGIN;
if (
  !origin ||
  !["localhost", "127.0.0.1"].includes(new URL(origin).hostname) ||
  new URL(origin).protocol !== "http:"
)
  throw new Error("Smoke restricted to the local HTTP composition");
for (const key of ["ADMIN_LOGIN_ID", "ADMIN_PASSWORD"])
  if (!env[key]) throw new Error("Missing " + key);
async function call(path, method = "GET", body, cookie) {
  const response = await fetch(origin + path, {
    method,
    headers: {
      origin,
      ...(cookie ? { cookie } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  return response;
}
async function login(access, loginId, password) {
  const response = await call("/api/v1/auth/login", "POST", {
    access,
    loginId,
    password,
  });
  assert.equal(response.status, 200, await response.clone().text());
  return response.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
}
const admin = await login("staff", env.ADMIN_LOGIN_ID, env.ADMIN_PASSWORD);
const suffix = Date.now().toString(36);
const password = "Local-smoke-" + suffix;
const tariffs = await (
  await call("/api/v1/admin/tariffs", "GET", undefined, admin)
).json();
const boxes = await (
  await call("/api/v1/boxes", "GET", undefined, admin)
).json();
const coachBody = {
  loginId: "smoke-" + suffix,
  dni: "00000000T",
  role: "coach",
  firstName: "Coach",
  lastName: "Prueba local",
  email: "coach-" + suffix + "@example.org",
  password,
};
const coachResponse = await call(
  "/api/v1/admin/staff",
  "POST",
  coachBody,
  admin,
);
assert.equal(coachResponse.status, 201);
const coachId = (await coachResponse.json()).id;
const memberBody = {
  dni: "m" + suffix,
  password,
  firstName: "Socio",
  lastName: "Prueba local",
  email: "member-" + suffix + "@example.org",
  tariffId: tariffs[0].id,
  paymentBoxId: boxes[0].id,
};
const memberResponse = await call(
  "/api/v1/admin/members",
  "POST",
  memberBody,
  admin,
);
assert.equal(memberResponse.status, 201);
const memberId = (await memberResponse.json()).id;
const coach = await login("staff", coachBody.loginId, password);
const member = await login("member", memberBody.dni, password);
for (const [role, cookie, paths] of [
  [
    "admin",
    admin,
    [
      "/staff/hoy",
      "/staff/semana",
      "/staff/socios",
      "/staff/equipo",
      "/staff/tarifas",
      "/staff/boxes",
      "/staff/horario",
      "/staff/plantilla",
      "/staff/biblioteca",
      "/staff/cobros",
      "/staff/impagos",
      "/staff/perfil",
      "/staff/excepciones",
    ],
  ],
  [
    "coach",
    coach,
    [
      "/staff/hoy",
      "/staff/semana",
      "/staff/socios",
      "/staff/biblioteca",
      "/staff/perfil",
    ],
  ],
  [
    "member",
    member,
    [
      "/calendario",
      "/reservas",
      "/historial",
      "/biblioteca",
      "/tarifa",
      "/cuenta",
    ],
  ],
]) {
  for (const path of paths) {
    const response = await call(path, "GET", undefined, cookie);
    const html = await response.text();
    assert.equal(response.status, 200, role + " " + path);
    assert.ok(html.includes('id="root"'), role + " " + path);
    console.log("SMOKE " + role + " " + path + " 200");
  }
}
for (const path of [
  "/staff/socios/" + memberId,
  "/staff/socios/" + memberId + "/pagos",
  "/staff/equipo/" + coachId,
  "/staff/biblioteca/nuevo",
]) {
  const response = await call(path, "GET", undefined, admin);
  const html = await response.text();
  assert.equal(response.status, 200, path);
  assert.ok(html.includes('id="root"'), path);
  console.log("SMOKE admin " + path + " 200");
}
const types = await (
  await call("/api/v1/admin/class-types", "GET", undefined, admin)
).json();
const trainingResponse = await call(
  "/api/v1/admin/trainings",
  "POST",
  {
    name: "Smoke " + suffix,
    classTypeId: types[0].id,
    phases: [
      { name: "Calentamiento", blocks: [{ body: "Movilidad y preparación" }] },
    ],
  },
  coach,
);
assert.equal(
  trainingResponse.status,
  201,
  await trainingResponse.clone().text(),
);
const trainingId = (await trainingResponse.json()).id;
const training = await (
  await call("/api/v1/trainings/" + trainingId, "GET", undefined, member)
).json();
assert.equal(training.phases[0].name, "Calentamiento");
for (const [cookie, path] of [
  [member, "/biblioteca/" + trainingId],
  [coach, "/staff/biblioteca/" + trainingId],
  [coach, "/staff/biblioteca/" + trainingId + "/editar"],
]) {
  const response = await call(path, "GET", undefined, cookie);
  const html = await response.text();
  assert.equal(response.status, 200, path);
  assert.ok(html.includes('id="root"'), path);
  console.log("SMOKE detail " + path + " 200");
}
const date = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
let instanceId;
for (let hour = 7; hour < 21; hour++) {
  const extra = await call(
    "/api/v1/admin/instances",
    "POST",
    {
      date,
      startTime: String(hour).padStart(2, "0") + ":00",
      endTime: String(hour + 1).padStart(2, "0") + ":00",
      classTypeId: types[0].id,
      coachId,
      capacity: 10,
      boxId: boxes[0].id,
    },
    coach,
  );
  if (
    extra.status === 409 &&
    (await extra.clone().json()).error?.code === "OVERLAP"
  )
    continue;
  assert.equal(extra.status, 201, await extra.clone().text());
  instanceId = (await extra.json()).id;
  break;
}
assert.ok(instanceId, "No free test slot in the local seed box");
const reserve = await call("/api/v1/bookings", "POST", { instanceId }, member);
assert.equal(reserve.status, 201, await reserve.clone().text());
for (const [cookie, path] of [
  [member, "/clases/" + instanceId],
  [coach, "/staff/clases/" + instanceId],
  [member, "/reservas"],
]) {
  const response = await call(path, "GET", undefined, cookie);
  const html = await response.text();
  assert.equal(response.status, 200, path);
  assert.ok(html.includes('id="root"'), path);
  console.log("SMOKE booked " + path + " 200");
}
const coachShell = await call("/staff/equipo", "GET", undefined, coach);
assert.equal(coachShell.status, 200);
assert.ok((await coachShell.text()).includes('id="root"'));
assert.equal(
  (await call("/api/v1/admin/staff", "GET", undefined, coach)).status,
  403,
);
assert.equal(
  (await call("/api/v1/admin/members", "GET", undefined, member)).status,
  403,
);
assert.equal((await call("/api/v1/me/profile", "GET")).status, 401);
assert.equal(
  (await call("/api/v1/cron/materialize", "GET", undefined, admin)).status,
  404,
);
console.log(
  "PASS SPA/HTTP: product URLs serve the shell, API proxy, login cookies, role denials, cron absent",
);
