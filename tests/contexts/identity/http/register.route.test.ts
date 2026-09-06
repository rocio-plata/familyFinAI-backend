// tests/contexts/identity/http/register.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { InMemoryFamilyRepository } from "../../../../src/contexts/family-access/infrastructure/persistence/in-memory-family.repository.js";
import { InMemoryInvitationRepository } from "../../../../src/contexts/family-access/infrastructure/persistence/in-memory-invitation.repository.js";
import {
  hashPassword,
  verifyPassword,
} from "../../../../src/contexts/identity/infrastructure/password-hasher.js";
import { InMemoryUserRepository } from "../../../../src/contexts/identity/infrastructure/persistence/in-memory-user.repository.js";
import { buildApp } from "../../../../src/platform/app.js";
import { TokenService } from "../../../../src/platform/auth/tokens.js";
import { InProcessEventBus } from "../../../../src/platform/events/in-process-event-bus.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { InMemoryRefreshTokenRepository } from "../../../platform/auth/doubles/in-memory-refresh-token.repository.js";

describe("POST /auth/register", () => {
  let app: FastifyInstance;
  let userRepository: InMemoryUserRepository;
  let familyRepository: InMemoryFamilyRepository;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    familyRepository = new InMemoryFamilyRepository();

    app = buildApp({
      jwtService: new FakeJwtService(),
      familyAccess: {
        familyRepository,
        invitationRepository: new InMemoryInvitationRepository(),
        userDirectory: { findUserIdByEmail: async () => null },
        eventBus: new InProcessEventBus(),
      },
      identity: {
        userRepository,
        tokenService: new TokenService(new FakeJwtService(), new InMemoryRefreshTokenRepository()),
        eventBus: new InProcessEventBus(),
        hashPassword,
        verifyPassword,
      },
    });
  });

  test("registra un usuario y le crea su familia personal", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "rocio@test.com", password: "supersecreta", displayName: "Rocío" },
    });

    assert.equal(response.statusCode, 201);
    const body = JSON.parse(response.body);
    assert.equal(body.email, "rocio@test.com");
    assert.equal(body.displayName, "Rocío");
    assert.ok(body.accessToken.length > 0);
    assert.ok(body.refreshToken.length > 0);
    assert.ok(body.defaultFamilyId);
  });

  test("la familia personal creada se llama 'Mis finanzas personales'", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "rocio@test.com", password: "supersecreta", displayName: "Rocío" },
    });

    const body = JSON.parse(response.body);
    const family = await familyRepository.findById(FamilyId.of(body.defaultFamilyId));
    assert.equal(family?.name.toString(), "Mis finanzas personales");
  });

  test("persiste al usuario registrado", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "rocio@test.com", password: "supersecreta", displayName: "Rocío" },
    });

    const body = JSON.parse(response.body);
    const persisted = await userRepository.findById(UserId.of(body.userId));
    assert.ok(persisted);
  });

  test("rechaza un email ya registrado con 409", async () => {
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "rocio@test.com", password: "supersecreta", displayName: "Rocío" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "rocio@test.com", password: "otra-contraseña", displayName: "Otro" },
    });

    assert.equal(response.statusCode, 409);
  });

  test("rechaza una contraseña débil con 400", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "rocio@test.com", password: "corta", displayName: "Rocío" },
    });

    assert.equal(response.statusCode, 400);
  });

  test("rechaza un body sin displayName", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "rocio@test.com", password: "supersecreta" },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "HTTP.INVALID_REQUEST_BODY");
  });
});
