import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { readdirSync } from "node:fs";
import { join } from "node:path";

process.loadEnvFile("infra/local.env");
const origin = process.env.PUBLIC_ORIGIN;
if (!origin || !["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
  throw new Error("Measure restricted to the local composition");

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

async function call(path, method, body, cookie) {
  const started = performance.now();
  const response = await fetch(origin + path, {
    method,
    headers: {
      origin,
      ...(cookie ? { cookie } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  await response.arrayBuffer();
  return { status: response.status, ms: performance.now() - started, cookie: response.headers.getSetCookie() };
}

const login = await call("/api/v1/auth/login", "POST", {
  access: "staff",
  loginId: process.env.ADMIN_LOGIN_ID,
  password: process.env.ADMIN_PASSWORD,
});
if (login.status !== 200) throw new Error("admin login " + login.status);
const admin = login.cookie.map((value) => value.split(";")[0]).join("; ");

const samples = 30;
const today = new Date().toISOString().slice(0, 10);
const routes = [
  ["/api/v1/admin/day?date=" + today, "hoy"],
  ["/api/v1/admin/members?status=active&page=1", "socios"],
  ["/api/v1/admin/members/options", "ficha-opciones"],
  ["/api/v1/boxes", "sedes"],
];
for (const [path, name] of routes) {
  const times = [];
  for (let i = 0; i < samples; i++) {
    const result = await call(path, "GET", undefined, admin);
    if (result.status !== 200) throw new Error(name + " " + result.status);
    times.push(result.ms);
  }
  console.log(
    `API ${name}: n=${samples} p50=${percentile(times, 50).toFixed(1)}ms p95=${percentile(times, 95).toFixed(1)}ms`,
  );
}

const suffix = Date.now().toString(36);
const tariffs = await (await fetch(origin + "/api/v1/admin/tariffs", { headers: { cookie: admin, origin } })).json();
const boxes = await (await fetch(origin + "/api/v1/boxes", { headers: { cookie: admin, origin } })).json();
const password = "Local-measure-" + suffix;
const memberBody = {
  dni: "n" + suffix,
  password,
  firstName: "Medida",
  lastName: "Local",
  email: "measure-" + suffix + "@example.org",
  tariffId: tariffs[0].id,
  paymentBoxId: boxes[0].id,
};
const created = await call("/api/v1/admin/members", "POST", memberBody, admin);
if (created.status !== 201) throw new Error("member " + created.status);
const memberLogin = await call("/api/v1/auth/login", "POST", {
  access: "member",
  loginId: memberBody.dni,
  password,
});
if (memberLogin.status !== 200) throw new Error("member login " + memberLogin.status);
const member = memberLogin.cookie.map((value) => value.split(";")[0]).join("; ");
const from = new Date().toISOString().slice(0, 10);
const to = new Date(Date.now() + 27 * 86400000).toISOString().slice(0, 10);
const calendarPath = `/api/v1/calendar?from=${from}&to=${to}`;
const calendarTimes = [];
for (let i = 0; i < samples; i++) {
  const result = await call(calendarPath, "GET", undefined, member);
  if (result.status !== 200) throw new Error("calendar " + result.status);
  calendarTimes.push(result.ms);
}
console.log(
  `API calendario: n=${samples} p50=${percentile(calendarTimes, 50).toFixed(1)}ms p95=${percentile(calendarTimes, 95).toFixed(1)}ms`,
);
const calendar = await (await fetch(origin + calendarPath, { headers: { cookie: member, origin } })).json();
const instanceId = (Array.isArray(calendar) ? calendar : []).find(
  (item) => item.status === "scheduled" && item.freeSpots > 0,
)?.id;
if (!instanceId) console.log("API reserva: sin clase libre en el horizonte sembrado");
else {
  const reserved = await call("/api/v1/bookings", "POST", { instanceId }, member);
  console.log(`API reserva: status=${reserved.status} once=${reserved.ms.toFixed(1)}ms`);
}

const assets = join("apps/web/dist/assets");
const html = readFileSync("apps/web/dist/index.html", "utf8");
const preloaded = [...html.matchAll(/\/assets\/[^"']+/g)].map((match) => match[0].slice(1));
let initial = gzipSync(readFileSync("apps/web/dist/index.html")).length;
for (const file of preloaded) {
  const size = gzipSync(readFileSync(join("apps/web/dist", file))).length;
  initial += size;
  console.log(`ASSET ${file} gzip=${size}`);
}
console.log(`ASSET initial-total gzip=${initial}`);
const editors = readdirSync(assets).filter((name) =>
  /date-picker|time-picker|training-form|page-/.test(name),
);
const editorBytes = editors.reduce(
  (sum, name) => sum + gzipSync(readFileSync(join(assets, name))).length,
  0,
);
console.log(
  `ASSET editor-chunks=${editors.length} gzip=${editorBytes} preloaded=${editors.filter((name) => preloaded.some((file) => file.endsWith(name))).length}`,
);
