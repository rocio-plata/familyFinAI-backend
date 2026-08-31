// tests/contexts/family-access/invite-member.usecase.test.ts
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { InviteMemberUseCase } from "../../../src/contexts/family-access/application/commands/invite-member.usecase.js";
import { InMemoryFamilyRepository } from "./doubles/in-memory-family.repository.js";
import { InMemoryInvitationRepository } from "../doubles/in-memory-invitation.repository.js";
import { FakeUserDirectory } from "../doubles/fake-user-directory.js";
import { FakeEventBus } from "./doubles/fake-event-bus.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { EmailAddress } from "../../../src/contexts/family-access/domain/value-objects/email-address.js";
import { Role } from "../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyNotFoundError } from "../../../src/contexts/family-access/domain/errors/family-not-found.error.js";
import { InsufficientRoleError } from "../../../src/contexts/family-access/domain/errors/insufficient-role.error.js";
import { AlreadyMemberError } from "../../../src/contexts/family-access/domain/errors/already-member.error.js";
import { MemberInvited } from "../../../src/contexts/family-access/domain/events/member-invited.event.js";

describe("InviteMemberUseCase", () => {
  let familyRepository: InMemoryFamilyRepository;
  let invitationRepository: InMemoryInvitationRepository;
  let userDirectory: FakeUserDirectory;
  let eventBus: FakeEventBus;
  let useCase: InviteMemberUseCase;
  let ownerId: UserId;
  let family: Family;

  beforeEach(async () => {
    familyRepository = new InMemoryFamilyRepository();
    invitationRepository = new InMemoryInvitationRepository();
    userDirectory = new FakeUserDirectory();
    eventBus = new FakeEventBus();
    useCase = new InviteMemberUseCase(familyRepository, invitationRepository, userDirectory, eventBus);

    ownerId = UserId.generate();
    family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    await familyRepository.save(family);
  });

  test("crea una invitación pendiente cuando el email no tiene cuenta previa", async () => {
    const email = EmailAddress.of("nuevo@ejemplo.com");

    await useCase.execute({
      familyId: family.id,
      email,
      role: Role.member(),
      invitedBy: ownerId,
    });

    const invitations = await invitationRepository.findByFamilyId(family.id);
    assert.equal(invitations.length, 1);
    assert.ok(invitations[0].invitedEmail.equals(email));
    assert.equal(invitations[0].status, "PENDING");
  });

  test("permite invitar a un email que ya tiene cuenta pero no es miembro de esta familia", async () => {
    const existingUserId = UserId.generate();
    const email = EmailAddress.of("externo@ejemplo.com");
    userDirectory.registerUser(email, existingUserId);

    await useCase.execute({
      familyId: family.id,
      email,
      role: Role.member(),
      invitedBy: ownerId,
    });

    const invitations = await invitationRepository.findByFamilyId(family.id);
    assert.equal(invitations.length, 1);
  });

  test("rechaza invitar a alguien que ya es miembro de la familia", async () => {
    const existingUserId = UserId.generate();
    const email = EmailAddress.of("yamiembro@ejemplo.com");
    userDirectory.registerUser(email, existingUserId);
    family.addMemberFromInvitationData(existingUserId, Role.member()); // helper de test, ver nota abajo
    await familyRepository.save(family);

    await assert.rejects(
      () => useCase.execute({ familyId: family.id, email, role: Role.member(), invitedBy: ownerId }),
      AlreadyMemberError,
    );
  });

  test("rechaza si la familia no existe", async () => {
    const email = EmailAddress.of("nuevo@ejemplo.com");
    const nonExistentFamilyId = FamilyId.generate();

    await assert.rejects(
      () => useCase.execute({ familyId: nonExistentFamilyId, email, role: Role.member(), invitedBy: ownerId }),
      FamilyNotFoundError,
    );
  });

  test("rechaza si quien invita no tiene rol suficiente", async () => {
    const nonOwnerId = UserId.generate();
    family.addMemberFromInvitationData(nonOwnerId, Role.member());
    await familyRepository.save(family);

    const email = EmailAddress.of("nuevo@ejemplo.com");

    await assert.rejects(
      () => useCase.execute({ familyId: family.id, email, role: Role.member(), invitedBy: nonOwnerId }),
      InsufficientRoleError,
    );
  });

  test("publica el evento MemberInvited", async () => {
    const email = EmailAddress.of("nuevo@ejemplo.com");

    await useCase.execute({ familyId: family.id, email, role: Role.member(), invitedBy: ownerId });

    assert.equal(eventBus.publishedEvents.length, 1);
    assert.ok(eventBus.publishedEvents[0] instanceof MemberInvited);
  });
});