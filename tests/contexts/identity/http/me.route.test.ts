// tests/contexts/identity/http/me.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../../../src/platform/app.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { buildTestFamilyAccessDependencies } from "../../family-access/build-test-family-access-dependencies.js";
import { buildTestIdentityDependencies } from "../build-test-identity-dependencies.js";

describe("rutas de perfil propio", () => {
  let app: FastifyInstance;
  let jwtService: FakeJwtService;
  let authorization: string;

  beforeEach(async () => {
    jwtService = new FakeJwtService();
    app = buildApp({
      jwtService,
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies(),
    });

    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "rocio@test.com", password: "supersecreta", displayName: "Rocío" },
    });
    const { accessToken } = JSON.parse(registerResponse.body);
    authorization = `Bearer ${accessToken}`;
  });

  test("devuelve el perfil del usuario autenticado", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/me/profile",
      headers: { authorization },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.email, "rocio@test.com");
    assert.equal(body.displayName, "Rocío");
    assert.ok(body.createdAt);
  });

  test("rechaza la consulta de perfil sin token", async () => {
    const response = await app.inject({ method: "GET", url: "/me/profile" });

    assert.equal(response.statusCode, 401);
  });

  test("cambia la contraseña con las credenciales actuales válidas", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/me/password",
      headers: { authorization },
      payload: { currentPassword: "supersecreta", newPassword: "nuevaclave123" },
    });

    assert.equal(response.statusCode, 204);

    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "rocio@test.com", password: "nuevaclave123" },
    });
    assert.equal(loginResponse.statusCode, 200);
  });

  test("rechaza el cambio si la contraseña actual es incorrecta", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/me/password",
      headers: { authorization },
      payload: { currentPassword: "incorrecta", newPassword: "nuevaclave123" },
    });

    assert.equal(response.statusCode, 401);
  });

  test("rechaza un cambio sin nueva contraseña", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/me/password",
      headers: { authorization },
      payload: { currentPassword: "supersecreta" },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "HTTP.INVALID_REQUEST_BODY");
  });

  test("actualiza el nombre para mostrar del usuario autenticado", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/me/display-name",
      headers: { authorization },
      payload: { displayName: "Rocío Plaza" },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).displayName, "Rocío Plaza");

    const profileResponse = await app.inject({
      method: "GET",
      url: "/me/profile",
      headers: { authorization },
    });
    assert.equal(JSON.parse(profileResponse.body).displayName, "Rocío Plaza");
  });

  test("rechaza la actualización de nombre para mostrar sin token", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/me/display-name",
      payload: { displayName: "Rocío Plaza" },
    });

    assert.equal(response.statusCode, 401);
  });

  test("rechaza un nombre para mostrar vacío", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/me/display-name",
      headers: { authorization },
      payload: { displayName: "" },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "HTTP.INVALID_REQUEST_BODY");
  });
});
