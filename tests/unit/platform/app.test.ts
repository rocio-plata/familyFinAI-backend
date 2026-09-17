// tests/platform/app.test.ts

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildApp } from "../../src/platform/app.js";
import { DomainError } from "../../src/shared-kernel/errors/domain-error.js";
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

  test("errores de dominio se traducen al status HTTP correcto", async () => {
    const app = buildTestApp();

    app.get("/test-error", async () => {
      throw new TestNotFoundError();
    });

    const response = await app.inject({ method: "GET", url: "/test-error" });

    assert.equal(response.statusCode, 404);
  });
});
