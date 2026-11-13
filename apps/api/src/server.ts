import Fastify, {
  type FastifyRequest,
  type FastifyReply,
  type HTTPMethods,
  type FastifyInstance,
} from "fastify";
import swagger from "@fastify/swagger";
import multipart from "@fastify/multipart";
import {
  validatorCompiler,
  serializerCompiler,
  jsonSchemaTransform,
} from "fastify-type-provider-zod";
import { z, error as errorDto } from "@78feet/contracts";
import { DomainError, apiErrorBody, type Role } from "@78feet/domain";
import type { Database } from "@78feet/db/connection";
import { sql } from "drizzle-orm";
import { createAuth, type AuthSettings, type Principal } from "./auth.ts";
import { MissingResource } from "@78feet/application/errors";
import { validateImage } from "@78feet/application/profiles";
import { registerRoutes } from "./routes.ts";

export type Upload = { data: Buffer; mimeType: string };
export type ApiOptions = {
  db: Database;
  auth: AuthSettings;
  close?: () => Promise<void>;
  loginIpLimit?: number;
  logger?: boolean;
};
export async function buildApi(options: ApiOptions) {
  const app = Fastify({
    logger: options.logger
      ? {
          serializers: {
            req: (request) => ({ id: request.id, method: request.method }),
          },
          redact: [
            "req.headers.cookie",
            "req.headers.authorization",
            "res.headers.set-cookie",
            "req.body",
          ],
        }
      : false,
    bodyLimit: 6 * 1024 * 1024,
    trustProxy: false,
  });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: { title: "78feet API", version: "1.0.0" },
      components: {
        securitySchemes: {
          memberSession: {
            type: "apiKey",
            in: "cookie",
            name: "feet-member.session_token",
          },
          staffSession: {
            type: "apiKey",
            in: "cookie",
            name: "feet-staff.session_token",
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 8, parts: 9 },
  });
  const auth = createAuth(options.db, options.auth);
  const ipAttempts = new Map<string, { count: number; until: number }>();
  app.addHook("onRequest", async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    if (
      req.routeOptions.url &&
      !["GET", "HEAD", "OPTIONS"].includes(req.method)
    ) {
      const origin = req.headers.origin;
      if (
        !origin ||
        ![options.auth.origin, ...options.auth.nativeOrigins].includes(origin)
      )
        throw Object.assign(
          new DomainError("FORBIDDEN", "Origen no permitido"),
          { statusCode: 403 },
        );
    }
    if (req.routeOptions.url === "/api/v1/auth/login") {
      const now = Date.now();
      for (const [ip, state] of ipAttempts)
        if (state.until <= now) ipAttempts.delete(ip);
      const state = ipAttempts.get(req.ip) ?? { count: 0, until: now + 60_000 };
      if (
        state.count >= (options.loginIpLimit ?? 20) ||
        (!ipAttempts.has(req.ip) && ipAttempts.size >= 5000)
      ) {
        reply.header("Retry-After", "60");
        throw Object.assign(new DomainError("ACCOUNT_LOCKED"), {
          statusCode: 429,
        });
      }
      state.count++;
      ipAttempts.set(req.ip, state);
    }
  });
  app.setErrorHandler((error, req, reply) => {
    const err = error as Error & {
      code?: string;
      statusCode?: number;
      validation?: unknown;
      cause?: { code?: string };
    };
    const cause = (err as Error & { cause?: { code?: string } }).cause;
    if (err instanceof MissingResource)
      return reply.code(404).send(apiErrorBody(err));
    if (err instanceof DomainError) {
      const status =
        (err as DomainError & { statusCode?: number }).statusCode ??
        (
          {
            FULL: 409,
            QUOTA_EXHAUSTED: 409,
            NO_MEMBERSHIP: 409,
            OVERLAP: 409,
            CONFIRM_REQUIRED: 409,
            CLASS_TYPE_IN_USE: 409,
            SCHEDULE_CLOSED: 409,
          } as Record<string, number>
        )[err.code] ??
        403;
      return reply.code(status).send(apiErrorBody(err));
    }
    if (
      err instanceof z.ZodError ||
      "validation" in err ||
      ["FST_ERR_CTP_INVALID_JSON_BODY", "FST_ERR_CTP_EMPTY_JSON_BODY"].includes(
        err.code ?? "",
      )
    )
      return reply
        .code(400)
        .send({ error: { code: "FORBIDDEN", message: "Datos no válidos" } });
    if (
      ["23505", "23503", "23514", "22003", "22P02"].includes(cause?.code ?? "")
    )
      return reply.code(cause?.code === "22P02" ? 400 : 409).send({
        error: {
          code: "FORBIDDEN",
          message: "Los datos entran en conflicto con el estado actual",
        },
      });
    if (err.statusCode && err.statusCode < 500)
      return reply.code(err.statusCode).send({
        error: {
          code: "FORBIDDEN",
          message:
            err.statusCode === 413
              ? "La imagen no puede superar 5 MB"
              : "Petición no válida",
        },
      });
    req.log.error({ code: err.code ?? "INTERNAL_ERROR" }, "Request failed");
    return reply.code(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "No se pudo completar la operación",
      },
    });
  });
  app.setNotFoundHandler((_req, reply) =>
    reply
      .code(404)
      .send({ error: { code: "NOT_FOUND", message: "Ruta no encontrada" } }),
  );
  if (options.close) app.addHook("onClose", async () => options.close!());
  app.get(
    "/api/v1/health",
    {
      schema: {
        operationId: "health",
        response: { 200: z.object({ status: z.literal("ok") }) },
      },
    },
    async () => ({ status: "ok" as const }),
  );
  app.get(
    "/api/v1/ready",
    {
      schema: {
        operationId: "ready",
        response: {
          200: z.object({ status: z.literal("ready") }),
          503: errorDto,
        },
      },
    },
    async (_req, reply) => {
      try {
        await options.db.execute(sql`SELECT 1`);
        return { status: "ready" as const };
      } catch {
        return reply.code(503).send({
          error: {
            code: "UNAVAILABLE",
            message: "Base de datos no disponible",
          },
        });
      }
    },
  );
  registerRoutes(app, options.db, auth);
  await app.ready();
  return app;
}
export type EndpointContext<B, Q> = {
  user: Principal;
  body: B;
  query: Q;
  params: Record<string, string>;
  request: FastifyRequest;
  reply: FastifyReply;
  image?: Upload;
};
export function endpoints(
  app: FastifyInstance,
  auth: ReturnType<typeof createAuth>,
) {
  const principals = new WeakMap<FastifyRequest, Principal>();
  return function endpoint<
    B extends z.ZodType = z.ZodUndefined,
    Q extends z.ZodType = z.ZodObject<{}>,
  >(
    method: HTTPMethods,
    path: string,
    roles: readonly Role[],
    response: z.ZodType,
    run: (
      context: EndpointContext<z.output<B>, z.output<Q>>,
    ) => Promise<unknown>,
    config: {
      body?: B;
      query?: Q;
      params?: z.ZodType;
      status?: number;
      upload?: boolean;
      operationId: string;
    },
  ) {
    const status = config.status ?? 200;
    app.route({
      method,
      url: "/api/v1" + path,
      schema: {
        operationId: config.operationId,
        description: `Roles: ${roles.join(", ")}`,
        security: [{ memberSession: [] }, { staffSession: [] }],
        ...(config.body && !config.upload ? { body: config.body } : {}),
        ...(config.query ? { querystring: config.query } : {}),
        ...(config.params ? { params: config.params } : {}),
        response: {
          [status]: response,
          400: errorDto,
          401: errorDto,
          403: errorDto,
          404: errorDto,
          409: errorDto,
          413: errorDto,
          415: errorDto,
          429: errorDto,
          500: errorDto,
        },
      },
      onRequest: async (req: FastifyRequest) => {
        const user = await auth.principal(req);
        if (!roles.includes(user.role)) throw new DomainError("FORBIDDEN");
        principals.set(req, user);
      },
      handler: async (req: FastifyRequest, reply: FastifyReply) => {
        const user = principals.get(req)!;
        let input = req.body;
        let image: Upload | undefined;
        if (config.upload) {
          if (!req.isMultipart())
            throw Object.assign(
              new DomainError("FORBIDDEN", "Se requiere multipart/form-data"),
              { statusCode: 415 },
            );
          const fields: Record<string, string> = {};
          for await (const part of req.parts()) {
            if (part.type === "file") {
              if (part.fieldname !== "image")
                throw new DomainError("FORBIDDEN");
              image = { data: await part.toBuffer(), mimeType: part.mimetype };
            } else fields[part.fieldname] = String(part.value);
          }
          input = fields;
        }
        if (image) {
          try {
            validateImage(image.data, image.mimeType);
          } catch (error) {
            throw Object.assign(error as Error, { statusCode: 400 });
          }
        }
        const output = await run({
          user,
          body: (config.body
            ? config.body.parse(input)
            : undefined) as z.output<B>,
          query: (config.query
            ? config.query.parse(req.query)
            : {}) as z.output<Q>,
          params: (req.params ?? {}) as Record<string, string>,
          request: req,
          reply,
          image,
        });
        reply.code(status);
        return output === undefined
          ? { ok: true }
          : JSON.parse(JSON.stringify(output));
      },
    });
  };
}
