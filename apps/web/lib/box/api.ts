export class ApiError extends Error {
  readonly code: string;
  readonly detachCount: number | undefined;

  constructor(code: string, message: string, detachCount?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.detachCount = detachCount;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(path, { credentials: "include", ...init, headers });
  const payload = (await response.json().catch(() => null)) as {
    error?: { code?: string; message?: string };
    detachCount?: number;
  } | null;
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.code ?? "FORBIDDEN",
      payload?.error?.message ?? "No se pudo completar",
      payload?.detachCount,
    );
  }
  return payload as T;
}
