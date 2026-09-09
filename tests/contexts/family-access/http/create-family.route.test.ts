// tests/contexts/family-access/http/create-family.route.test.ts

import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { buildApp } from "../../../../src/platform/app.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { FakeEventBus } from "../../../shared/doubles/fake-event-bus.js";
import { buildTestFinancialTrackingDependencies } from "../../financial-tracking/build-test-financial-tracking-dependencies.js";
import { buildTestIdentityDependencies } from "../../identity/build-test-identity-dependencies.js";
import { buildTestFamilyAccessDependencies } from "../build-test-family-access-dependencies.js";

describe("POST /families", () => {
  let app: FastifyInstance;
  let jwtService: FakeJwtService;
  let userId: UserId;
  let token: string;

  beforeEach(async () => {
    jwtService = new FakeJwtService();
    userId = UserId.generate();
    token = await jwtService.sign(userId);

    const eventBus = new FakeEventBus();

    app = buildApp({
      jwtService,
      identity: buildTestIdentityDependencies({ eventBus }),
      familyAccess: buildTestFamilyAccessDependencies({ eventBus }),
      financialTracking: buildTestFinancialTrackingDependencies({ eventBus }),
    });
  });

  test("crea una familia y devuelve 201 con el recurso creado", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/families",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Familia Pérez" },
    });

    assert.equal(response.statusCode, 201);
    const body = JSON.parse(response.body);
    assert.equal(body.name, "Familia Pérez");
    assert.equal(body.defaultCurrency, "CLP");
    assert.ok(body.id);
  });

  test("crea automáticamente las 9 categorías por defecto al crear una familia", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/families",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Familia Gómez" },
    });

    assert.equal(createResponse.statusCode, 201);
    const family = JSON.parse(createResponse.body);

    const categoriesResponse = await app.inject({
      method: "GET",
      url: `/families/${family.id}/categories`,
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(categoriesResponse.statusCode, 200);
    const categories = JSON.parse(categoriesResponse.body);
    assert.equal(categories.length, 9);

    const names = categories.map((c: { name: string }) => c.name);
    const expected = [
      "Comestibles",
      "Salud",
      "Restaurantes",
      "Servicios",
      "Compras",
      "Regalos",
      "Familia",
      "Tiempo Libre",
      "Transporte",
    ];
    for (const exp of expected) {
      assert.ok(names.includes(exp), `Categoría por defecto ausente: ${exp}`);
    }
  });

  test("rechaza sin token de autenticación", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/families",
      payload: { name: "Familia Pérez" },
    });

    assert.equal(response.statusCode, 401);
  });

  test("rechaza un nombre vacío con 400", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/families",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "" },
    });

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.equal(body.error, "HTTP.INVALID_REQUEST_BODY");
    assert.equal(typeof body.message, "string");
  });

  test("rechaza un body sin el nombre con 400", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/families",
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.equal(body.error, "HTTP.INVALID_REQUEST_BODY");
    assert.equal(typeof body.message, "string");
  });

  test("coacciona un nombre numérico y crea la familia", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/families",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 123 },
    });

    assert.equal(response.statusCode, 201);
    const body = JSON.parse(response.body);
    assert.equal(body.name, "123");
  });
});
