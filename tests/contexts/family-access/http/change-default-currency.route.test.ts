// tests/contexts/family-access/http/change-default-currency.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { buildApp } from "../../../../src/platform/app.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { FakeEventBus } from "../../../shared/doubles/fake-event-bus.js";
import { FakeUserDirectory } from "../doubles/fake-user-directory.js";
import { InMemoryFamilyRepository } from "../doubles/in-memory-family.repository.js";
import { InMemoryInvitationRepository } from "../doubles/in-memory-invitation.repository.js";

describe("PATCH /families/:familyId/settings/currency", () => {
  let app: FastifyInstance;
  let familyRepository: InMemoryFamilyRepository;
  let jwtService: FakeJwtService;

  beforeEach(() => {
    familyRepository = new InMemoryFamilyRepository();
    jwtService = new FakeJwtService();

    app = buildApp({
      jwtService,
      familyAccess: {
        familyRepository,
        invitationRepository: new InMemoryInvitationRepository(),
        userDirectory: new FakeUserDirectory(),
        eventBus: new FakeEventBus(),
      },
    });
  });

  test("cambia la moneda por defecto cuando quien ejecuta es Owner", async () => {
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    await familyRepository.save(family);
    const token = await jwtService.sign(ownerId);

    const response = await app.inject({
      method: "PATCH",
      url: `/families/${family.id.toString()}/settings/currency`,
      headers: { authorization: `Bearer ${token}` },
      payload: { newCurrency: "USD" },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.body, "");
    const updatedFamily = await familyRepository.findById(family.id);
    assert.equal(updatedFamily?.defaultCurrency.toString(), "USD");
  });

  test("rechaza sin token de autenticación", async () => {
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    await familyRepository.save(family);

    const response = await app.inject({
      method: "PATCH",
      url: `/families/${family.id.toString()}/settings/currency`,
      payload: { newCurrency: "USD" },
    });

    assert.equal(response.statusCode, 401);
  });

  test("rechaza con 403 si quien ejecuta no es Owner", async () => {
    const ownerId = UserId.generate();
    const memberId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.addMemberFromInvitationData(memberId, Role.member());
    await familyRepository.save(family);
    const token = await jwtService.sign(memberId);

    const response = await app.inject({
      method: "PATCH",
      url: `/families/${family.id.toString()}/settings/currency`,
      headers: { authorization: `Bearer ${token}` },
      payload: { newCurrency: "USD" },
    });

    assert.equal(response.statusCode, 403);
  });

  test("rechaza con 403 si quien ejecuta no pertenece a la familia", async () => {
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    await familyRepository.save(family);
    const outsiderId = UserId.generate();
    const token = await jwtService.sign(outsiderId);

    const response = await app.inject({
      method: "PATCH",
      url: `/families/${family.id.toString()}/settings/currency`,
      headers: { authorization: `Bearer ${token}` },
      payload: { newCurrency: "USD" },
    });

    assert.equal(response.statusCode, 403);
  });

  test("devuelve 400 si la moneda no está soportada", async () => {
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    await familyRepository.save(family);
    const token = await jwtService.sign(ownerId);

    const response = await app.inject({
      method: "PATCH",
      url: `/families/${family.id.toString()}/settings/currency`,
      headers: { authorization: `Bearer ${token}` },
      payload: { newCurrency: "XYZ" },
    });

    assert.equal(response.statusCode, 400);
  });

  test("rechaza un body sin newCurrency", async () => {
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    await familyRepository.save(family);
    const token = await jwtService.sign(ownerId);

    const response = await app.inject({
      method: "PATCH",
      url: `/families/${family.id.toString()}/settings/currency`,
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "HTTP.INVALID_REQUEST_BODY");
  });

  test("rechaza con 403 si la familia no existe (mismo status que 'no soy miembro')", async () => {
    const token = await jwtService.sign(UserId.generate());

    const response = await app.inject({
      method: "PATCH",
      url: `/families/${FamilyId.generate().toString()}/settings/currency`,
      headers: { authorization: `Bearer ${token}` },
      payload: { newCurrency: "USD" },
    });

    assert.equal(response.statusCode, 403);
  });
});
