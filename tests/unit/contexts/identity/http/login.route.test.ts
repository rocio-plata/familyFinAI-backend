// tests/contexts/identity/http/login.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../../../src/platform/app.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { buildTestFamilyAccessDependencies } from "../../family-access/build-test-family-access-dependencies.js";
import { buildTestIdentityDependencies } from "../build-test-identity-dependencies.js";

describe("POST /auth/login", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = buildApp({
      jwtService: new FakeJwtService(),
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies(),
    });

    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "rocio@test.com", password: "supersecreta", displayName: "Rocío" },
    });
  });

  test("inicia sesión con credenciales correctas", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "rocio@test.com", password: "supersecreta" },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.email, "rocio@test.com");
    assert.equal(body.displayName, "Rocío");
    assert.ok(body.accessToken.length > 0);
    assert.ok(body.refreshToken.length > 0);
  });

  test("rechaza si el email no existe", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "otro@test.com", password: "supersecreta" },
    });

    assert.equal(response.statusCode, 401);
  });

  test("rechaza si la contraseña es incorrecta", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "rocio@test.com", password: "incorrecta" },
    });

    assert.equal(response.statusCode, 401);
  });

  test("rechaza un body sin password", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "rocio@test.com" },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "HTTP.INVALID_REQUEST_BODY");
  });
});
