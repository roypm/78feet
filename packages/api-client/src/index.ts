import createClient, { type ClientOptions } from "openapi-fetch";
import type { paths, components } from "./schema.js";
export type { paths, components };
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly detachCount?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
// openapi-fetch performs no automatic retries. Cookie ownership stays with the
// browser or the native transport; a mobile caller supplies its SecureStore fetch.
export function createApiClient(options: ClientOptions = {}) {
  const client = createClient<paths>({
    credentials: "include",
    bodySerializer: (body) => {
      if (body && typeof body === "object" && Object.hasOwn(body, "image")) {
        const form = new FormData();
        for (const [key, value] of Object.entries(body))
          if (value !== undefined && value !== null)
            form.set(key, value instanceof Blob ? value : String(value));
        return form;
      }
      return JSON.stringify(body);
    },
    ...options,
  });
  client.use({
    async onRequest({ request, schemaPath }) {
      const upload =
        (schemaPath === "/api/v1/me/profile-image" &&
          request.method === "POST") ||
        (schemaPath === "/api/v1/admin/class-types" &&
          request.method === "POST") ||
        (schemaPath === "/api/v1/admin/class-types/{id}" &&
          request.method === "PATCH");
      if (
        upload &&
        request.headers.get("content-type")?.includes("application/json")
      ) {
        const values = (await request.json()) as Record<string, unknown>;
        const form = new FormData();
        for (const [key, value] of Object.entries(values))
          if (value !== undefined && value !== null)
            form.set(key, String(value));
        const headers = new Headers(request.headers);
        headers.delete("content-type");
        return new Request(request, { body: form, headers });
      }
    },
    async onResponse({ response }) {
      if (!response.ok) {
        let body: unknown;
        try {
          body = await response.clone().json();
        } catch {
          body = null;
        }
        const value = body as {
          error?: { code?: string; message?: string };
          detachCount?: number;
        } | null;
        throw new ApiError(
          response.status,
          value?.error?.code ?? "HTTP_ERROR",
          value?.error?.message ?? "No se pudo completar la operación",
          value?.detachCount,
        );
      }
    },
  });
  return client;
}

export async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has("content-type")
  )
    headers.set("content-type", "application/json");
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers,
  });
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    const value = body as {
      error?: { code?: string; message?: string };
      detachCount?: number;
    } | null;
    throw new ApiError(
      response.status,
      value?.error?.code ?? "HTTP_ERROR",
      value?.error?.message ?? "No se pudo completar la operación",
      value?.detachCount,
    );
  }
  return response.json() as Promise<T>;
}
