// tests/contexts/family-access/http/invite-member.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { InvitationId } from "../../../../src/contexts/family-access/domain/value-objects/invitation-id.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { buildApp } from "../../../../src/platform/app.js";
import { EmailAddress } from "../../../../src/shared-kernel/domain/email-address.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { buildTestIdentityDependencies } from "../../identity/build-test-identity-dependencies.js";
import { buildTestFamilyAccessDependencies } from "../build-test-family-access-dependencies.js";
import { FakeUserDirectory } from "../doubles/fake-user-directory.js";
import { InMemoryFamilyRepository } from "../doubles/in-memory-family.repository.js";
import { InMemoryInvitationRepository } from "../doubles/in-memory-invitation.repository.js";

describe("POST /families/:familyId/invitations", () => {
  let app: FastifyInstance;
  let familyRepository: InMemoryFamilyRepository;
  let invitationRepository: InMemoryInvitationRepository;
  let userDirectory: FakeUserDirectory;
  let jwtService: FakeJwtService;

  beforeEach(() => {
    familyRepository = new InMemoryFamilyRepository();
    invitationRepository = new InMemoryInvitationRepository();
    userDirectory = new FakeUserDirectory();
    jwtService = new FakeJwtService();

    app = buildApp({
      jwtService,
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies({
        familyRepository,
        invitationRepository,
        userDirectory,
      }),
    });
  });

  test("crea una invitación cuando quien ejecuta es Owner", async () => {
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    await familyRepository.save(family);
    const token = await jwtService.sign(ownerId);

    const response = await app.inject({
      method: "POST",
      url: `/families/${family.id.toString()}/invitations`,
      headers: { authorization: `Bearer ${token}` },
      payload: { email: "nuevo@test.com", role: "MEMBER" },
    });

    assert.equal(response.statusCode, 201);
    const body = JSON.parse(response.body);
    assert.equal(body.invitedEmail, "nuevo@test.com");
    assert.equal(body.role, "MEMBER");
    assert.equal(body.status, "PENDING");
    assert.ok(body.id);
  });

  test("persiste la invitación", async () => {
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    await familyRepository.save(family);
    const token = await jwtService.sign(ownerId);

    const response = await app.inject({
      method: "POST",
      url: `/families/${family.id.toString()}/invitations`,
      headers: { authorization: `Bearer ${token}` },
      payload: { email: "nuevo@test.com", role: "MEMBER" },
    });

    const body = JSON.parse(response.body);
    const persisted = await invitationRepository.findById(InvitationId.of(body.id));
    assert.ok(persisted);
  });

  test("rechaza sin token de autenticación", async () => {
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    await familyRepository.save(family);

    const response = await app.inject({
      method: "POST",
      url: `/families/${family.id.toString()}/invitations`,
      payload: { email: "nuevo@test.com", role: "MEMBER" },
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
      method: "POST",
      url: `/families/${family.id.toString()}/invitations`,
      headers: { authorization: `Bearer ${token}` },
      payload: { email: "nuevo@test.com", role: "MEMBER" },
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
      method: "POST",
      url: `/families/${family.id.toString()}/invitations`,
      headers: { authorization: `Bearer ${token}` },
      payload: { email: "nuevo@test.com", role: "MEMBER" },
    });

    assert.equal(response.statusCode, 403);
  });

  test("devuelve 409 si el email ya pertenece a un miembro de la familia", async () => {
    const ownerId = UserId.generate();
    const existingMemberId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.addMemberFromInvitationData(existingMemberId, Role.member());
    await familyRepository.save(family);
    userDirectory.registerUser(EmailAddress.of("existente@test.com"), existingMemberId);
    const token = await jwtService.sign(ownerId);

    const response = await app.inject({
      method: "POST",
      url: `/families/${family.id.toString()}/invitations`,
      headers: { authorization: `Bearer ${token}` },
      payload: { email: "existente@test.com", role: "MEMBER" },
    });

    assert.equal(response.statusCode, 409);
  });

  test("rechaza un email con formato inválido", async () => {
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    await familyRepository.save(family);
    const token = await jwtService.sign(ownerId);

    const response = await app.inject({
      method: "POST",
      url: `/families/${family.id.toString()}/invitations`,
      headers: { authorization: `Bearer ${token}` },
      payload: { email: "no-es-un-email", role: "MEMBER" },
    });

    assert.equal(response.statusCode, 400);
  });

  test("rechaza un body sin email", async () => {
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    await familyRepository.save(family);
    const token = await jwtService.sign(ownerId);

    const response = await app.inject({
      method: "POST",
      url: `/families/${family.id.toString()}/invitations`,
      headers: { authorization: `Bearer ${token}` },
      payload: { role: "MEMBER" },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "HTTP.INVALID_REQUEST_BODY");
  });

  test("rechaza con 403 si la familia no existe (mismo status que 'no soy miembro')", async () => {
    const token = await jwtService.sign(UserId.generate());

    const response = await app.inject({
      method: "POST",
      url: `/families/${FamilyId.generate().toString()}/invitations`,
      headers: { authorization: `Bearer ${token}` },
      payload: { email: "nuevo@test.com", role: "MEMBER" },
    });

    assert.equal(response.statusCode, 403);
  });
});
