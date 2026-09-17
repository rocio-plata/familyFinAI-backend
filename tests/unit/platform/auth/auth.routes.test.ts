// tests/platform/auth/auth.routes.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../../src/platform/app.js";
import { buildTestFamilyAccessDependencies } from "../../contexts/family-access/build-test-family-access-dependencies.js";
import { buildTestIdentityDependencies } from "../../contexts/identity/build-test-identity-dependencies.js";
import { FakeJwtService } from "./doubles/fake-jwt-service.js";

describe("rutas de tokens", () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildApp({
      jwtService: new FakeJwtService(),
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies(),
    });
  });

  async function registerUser(): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "rocio@test.com", password: "supersecreta", displayName: "Rocío" },
    });

    assert.equal(response.statusCode, 201);
    return JSON.parse(response.body);
  }

  test("rota un refresh token válido", async () => {
    const tokens = await registerUser();

    const response = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: tokens.refreshToken },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.ok(body.accessToken);
    assert.ok(body.refreshToken);
    assert.notEqual(body.refreshToken, tokens.refreshToken);
  });

  test("rechaza un refresh token inexistente", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: "token-inexistente" },
    });

    assert.equal(response.statusCode, 401);
    assert.equal(JSON.parse(response.body).error, "AUTH.INVALID_REFRESH_TOKEN");
  });

  test("detecta el reuso de un refresh token rotado", async () => {
    const tokens = await registerUser();

    const firstRefresh = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: tokens.refreshToken },
    });
    assert.equal(firstRefresh.statusCode, 200);

    const reusedRefresh = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: tokens.refreshToken },
    });

    assert.equal(reusedRefresh.statusCode, 401);
    assert.equal(JSON.parse(reusedRefresh.body).error, "AUTH.POSSIBLE_TOKEN_THEFT");
  });

  test("cierra todas las sesiones del usuario autenticado", async () => {
    const tokens = await registerUser();

    const logoutResponse = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: { authorization: `Bearer ${tokens.accessToken}` },
    });
    assert.equal(logoutResponse.statusCode, 204);

    const refreshResponse = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: tokens.refreshToken },
    });
    assert.equal(refreshResponse.statusCode, 401);
    assert.equal(JSON.parse(refreshResponse.body).error, "AUTH.POSSIBLE_TOKEN_THEFT");
  });

  test("rechaza el cierre de sesión sin token de acceso", async () => {
    const response = await app.inject({ method: "POST", url: "/auth/logout" });

    assert.equal(response.statusCode, 401);
  });
});
