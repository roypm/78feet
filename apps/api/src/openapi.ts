import { z } from "@78feet/contracts";
import { uploadBodies } from "./routes.ts";
import { writeFile } from "node:fs/promises";
import { connect } from "@78feet/db/connection";
import { buildApi } from "./server.ts";
const connection = connect("postgresql://localhost/feet_contract_generation");
const app = await buildApi({
  db: connection.db,
  close: connection.close,
  auth: {
    origin: "http://localhost:3000",
    memberSecret: "contract-generation-only-member-secret-1234",
    staffSecret: "contract-generation-only-staff-secret-5678",
    nativeOrigins: [],
  },
});
try {
  const document = app.swagger();
  // Derive multipart documentation from the fields validated by each handler.
  for (const item of Object.values(document.paths ?? {}))
    for (const operation of Object.values(item ?? {})) {
      if (
        operation &&
        typeof operation === "object" &&
        "operationId" in operation
      ) {
        const name = String(operation.operationId) as keyof typeof uploadBodies;
        if (name in uploadBodies) {
          const { $schema, ...schema } = z.toJSONSchema(uploadBodies[name]);
          Object.assign(operation, {
            requestBody: {
              required: true,
              content: {
                "multipart/form-data": {
                  schema: {
                    ...schema,
                    ...(name === "saveProfileImage"
                      ? { required: ["image"] }
                      : {}),
                  },
                },
              },
            },
          });
        }
      }
    }
  await writeFile(
    new URL("../../../packages/contracts/openapi.json", import.meta.url),
    JSON.stringify(document, null, 2) + "\n",
  );
} finally {
  await app.close();
}
