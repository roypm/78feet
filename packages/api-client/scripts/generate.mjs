import openapiTS, { astToString, COMMENT_HEADER } from "openapi-typescript";
import ts from "typescript";
import { writeFile } from "node:fs/promises";
const ast = await openapiTS(
  new URL("../../contracts/openapi.json", import.meta.url),
  {
    transform(schema) {
      if (schema.format === "binary")
        return ts.factory.createTypeReferenceNode("Blob");
    },
  },
);
await writeFile(
  new URL("../src/schema.d.ts", import.meta.url),
  COMMENT_HEADER + astToString(ast),
);
