export async function callRoute(
  handler: (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>,
  method: string,
  path: string,
  options?: {
    token?: string | null;
    body?: unknown;
    params?: Record<string, string>;
    cookie?: string;
  },
): Promise<{ status: number; headers: Headers; json: Record<string, unknown> | null }> {
  const request = new Request(`http://localhost${path}`, {
    method,
    headers: {
      ...(options?.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options?.cookie ? { cookie: options.cookie } : {}),
      ...(options?.body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const response = await handler(request, { params: Promise.resolve(options?.params ?? {}) });
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  const json =
    text && contentType.includes("json") ? (JSON.parse(text) as Record<string, unknown>) : null;
  return {
    status: response.status,
    headers: response.headers,
    json,
  };
}
