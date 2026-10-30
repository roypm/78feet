import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

// A successful Next build alone does not guarantee that Tailwind was processed.
const directory = join(process.cwd(), ".next/static/css");
const files = (await readdir(directory)).filter((file) => file.endsWith(".css"));
assert.ok(files.length, "El build no generó hojas de estilo");
const css = (await Promise.all(files.map((file) => readFile(join(directory, file), "utf8")))).join("\n");
assert.doesNotMatch(css, /@(apply|theme|custom-variant|tailwind)\b/, "Quedan directivas de Tailwind sin procesar");
assert.match(css, /\.fixed\s*\{\s*position:\s*fixed/, "Faltan las utilidades de posición de los diálogos");
assert.match(css, /\.flex\s*\{\s*display:\s*flex/, "Faltan las utilidades de layout");
assert.match(css, /pointer-hover/, "Faltan las variantes de hover de la interfaz");
console.log("CSS de producción verificado: Tailwind compilado, layout, overlays y hover.");
