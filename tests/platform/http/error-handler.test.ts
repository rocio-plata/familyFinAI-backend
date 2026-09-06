// tests/platform/http/error-handler.test.ts

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildApp } from "../../../src/platform/app.js";
import { buildTestFamilyAccessDependencies } from "../../contexts/family-access/build-test-family-access-dependencies.js";
import { buildTestIdentityDependencies } from "../../contexts/identity/build-test-identity-dependencies.js";
import { FakeJwtService } from "../auth/doubles/fake-jwt-service.js";

describe("error handler — validación de schema de Fastify", () => {
  test("un error de validación de JSON Schema devuelve 400 con formato consistente", async () => {
    const app = buildApp({
      jwtService: new FakeJwtService(),
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies(),
    });

    app.post(
      "/test-schema",
      {
        schema: {
          body: {
            type: "object",
            required: ["name"],
            properties: { name: { type: "string", minLength: 1 } },
          },
        },
      },
      async () => ({ ok: true }),
    );

    const response = await app.inject({
      method: "POST",
      url: "/test-schema",
      payload: { name: "" },
    });

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.equal(body.error, "HTTP.INVALID_REQUEST_BODY");
  });
});
