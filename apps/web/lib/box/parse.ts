import { BoxError } from "./errors";

type Parser<T> = { parse: (body: unknown) => T };

export function parseSchema<T>(schema: Parser<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (error) {
    const message = firstIssue(error);
    if (message) throw new BoxError(400, "FORBIDDEN", message);
    throw error;
  }
}

function firstIssue(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("issues" in error)) return null;
  const issues = (error as { issues: unknown }).issues;
  if (!Array.isArray(issues) || issues.length === 0) return "Datos inválidos";
  const message = (issues[0] as { message?: unknown }).message;
  return typeof message === "string" ? message : "Datos inválidos";
}
