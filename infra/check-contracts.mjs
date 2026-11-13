import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const files = [
  "packages/contracts/openapi.json",
  "packages/api-client/src/schema.d.ts",
];
const before = files.map((path) => readFileSync(path, "utf8"));
execFileSync("pnpm", ["contracts:generate"], { stdio: "inherit" });
const changed = files.filter(
  (path, index) => readFileSync(path, "utf8") !== before[index],
);
if (changed.length) {
  console.error("Contratos desfasados: " + changed.join(", "));
  process.exitCode = 1;
} else console.log("OpenAPI y cliente reproducibles; sin diferencias");
