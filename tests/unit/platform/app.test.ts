// tests/unit/platform/app.test.ts

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildApp } from "../../../src/platform/app.js";
import { DomainError } from "../../../src/shared-kernel/errors/domain-error.js";
import { buildTestFamilyAccessDependencies } from "../contexts/family-access/build-test-family-access-dependencies.js";
import { buildTestIdentityDependencies } from "../contexts/identity/build-test-identity-dependencies.js";
import { FakeJwtService } from "./auth/doubles/fake-jwt-service.js";

class TestNotFoundError extends DomainError {
  readonly code = "FAMILY_ACCESS.FAMILY_NOT_FOUND";

  constructor() {
    super("Recurso de prueba no encontrado");
  }
}

function buildTestApp() {
  return buildApp({
    jwtService: new FakeJwtService(),
    identity: buildTestIdentityDependencies(),
    familyAccess: buildTestFamilyAccessDependencies(),
  });
}

describe("buildApp", () => {
  test("responde /health con status ok", async () => {
    const app = buildTestApp();

    const response = await app.inject({ method: "GET", url: "/health" });

    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).status, "ok");
  });

  test("sirve Swagger UI y el contrato solo cuando se habilita localmente", async () => {
    const previousSwaggerFlag = process.env.ENABLE_LOCAL_SWAGGER;
    const previousNodeEnvironment = process.env.NODE_ENV;
    process.env.ENABLE_LOCAL_SWAGGER = "true";
    delete process.env.NODE_ENV;

    try {
      const app = buildTestApp();
      const uiResponse = await app.inject({ method: "GET", url: "/docs" });
      const contractResponse = await app.inject({ method: "GET", url: "/docs/openapi.yaml" });

      assert.equal(uiResponse.statusCode, 200);
      assert.match(uiResponse.body, /SwaggerUIBundle/);
      assert.equal(contractResponse.statusCode, 200);
      assert.match(contractResponse.body, /openapi: 3\.1\.0/);
    } finally {
      if (previousSwaggerFlag === undefined) delete process.env.ENABLE_LOCAL_SWAGGER;
      else process.env.ENABLE_LOCAL_SWAGGER = previousSwaggerFlag;
      if (previousNodeEnvironment === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnvironment;
    }
  });

  test("no registra Swagger UI en produccion aunque este habilitado", async () => {
    const previousSwaggerFlag = process.env.ENABLE_LOCAL_SWAGGER;
    const previousNodeEnvironment = process.env.NODE_ENV;
    process.env.ENABLE_LOCAL_SWAGGER = "true";
    process.env.NODE_ENV = "production";

    try {
      const app = buildTestApp();
      const response = await app.inject({ method: "GET", url: "/docs" });

      assert.equal(response.statusCode, 404);
    } finally {
      if (previousSwaggerFlag === undefined) delete process.env.ENABLE_LOCAL_SWAGGER;
      else process.env.ENABLE_LOCAL_SWAGGER = previousSwaggerFlag;
      if (previousNodeEnvironment === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnvironment;
    }
  });

  test("errores de dominio se traducen al status HTTP correcto", async () => {
    const app = buildTestApp();

    app.get("/test-error", async () => {
      throw new TestNotFoundError();
    });

    const response = await app.inject({ method: "GET", url: "/test-error" });

    assert.equal(response.statusCode, 404);
  });
});
