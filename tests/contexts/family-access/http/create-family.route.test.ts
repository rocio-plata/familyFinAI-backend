// tests/contexts/family-access/http/create-family.route.test.ts

import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { buildApp } from "../../../../src/platform/app.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { FakeEventBus } from "../../../shared/doubles/fake-event-bus.js";
import { InMemoryFamilyRepository } from "../doubles/in-memory-family.repository.js";

describe("POST /families", () => {
  let app: FastifyInstance;
  let jwtService: FakeJwtService;
  let userId: UserId;
  let token: string;

  beforeEach(async () => {
    jwtService = new FakeJwtService();
    userId = UserId.generate();
    token = await jwtService.sign(userId);

    app = buildApp({
      jwtService,
      familyAccess: {
        familyRepository: new InMemoryFamilyRepository(),
        eventBus: new FakeEventBus(),
      },
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
  });
});
