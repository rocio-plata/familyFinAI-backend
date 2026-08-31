// tests/contexts/family-access/accept-invitation.usecase.test.ts
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { AcceptInvitationUseCase } from "../../../src/contexts/family-access/application/commands/accept-invitation.usecase.js";
import { InMemoryFamilyRepository } from "./doubles/in-memory-family.repository.js";
import { InMemoryInvitationRepository } from "./doubles/in-memory-invitation.repository.js";
import { FakeEventBus } from "./doubles/fake-event-bus.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { EmailAddress } from "../../../src/contexts/family-access/domain/value-objects/email-address.js";
import { Role } from "../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { InvitationId } from "../../../src/contexts/family-access/domain/value-objects/invitation-id.js";
import { InvitationNotPendingError } from "../../../src/contexts/family-access/domain/errors/invitation-not-pending.error.js";
import { InvitationExpiredError } from "../../../src/contexts/family-access/domain/errors/invitation-expired.error.js";
import { InvitationNotFoundError } from "../../../src/contexts/family-access/domain/errors/invitation-not-found.error.js";
import { InvitationAccepted } from "../../../src/contexts/family-access/domain/events/invitation-accepted.event.js";

describe("AcceptInvitationUseCase", () => {
  let familyRepository: InMemoryFamilyRepository;
  let invitationRepository: InMemoryInvitationRepository;
  let eventBus: FakeEventBus;
  let useCase: AcceptInvitationUseCase;
  let ownerId: UserId;
  let family: Family;

  beforeEach(async () => {
    familyRepository = new InMemoryFamilyRepository();
    invitationRepository = new InMemoryInvitationRepository();
    eventBus = new FakeEventBus();
    useCase = new AcceptInvitationUseCase(familyRepository, invitationRepository, eventBus);

    ownerId = UserId.generate();
    family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    await familyRepository.save(family);
  });

  test("agrega al usuario como miembro de la familia con el rol de la invitación", async () => {
    const invitation = family.inviteMember(EmailAddress.of("nuevo@ejemplo.com"), Role.member());
    await invitationRepository.save(invitation);
    const acceptingUserId = UserId.generate();

    await useCase.execute({ invitationId: invitation.id, acceptingUserId });

    const updatedFamily = await familyRepository.findById(family.id);
    const membership = updatedFamily?.findMembership(acceptingUserId);
    assert.ok(membership !== null);
    assert.ok(membership?.role.equals(Role.member()));
  });

  test("marca la invitación como aceptada", async () => {
    const invitation = family.inviteMember(EmailAddress.of("nuevo@ejemplo.com"), Role.member());
    await invitationRepository.save(invitation);
    const acceptingUserId = UserId.generate();

    await useCase.execute({ invitationId: invitation.id, acceptingUserId });

    const updated = await invitationRepository.findById(invitation.id);
    assert.equal(updated?.status, "ACCEPTED");
  });

  test("rechaza si la invitación no existe", async () => {
    await assert.rejects(
      () => useCase.execute({ invitationId: InvitationId.generate(), acceptingUserId: UserId.generate() }),
      InvitationNotFoundError,
    );
  });

  test("rechaza si la invitación ya fue aceptada previamente", async () => {
    const invitation = family.inviteMember(EmailAddress.of("nuevo@ejemplo.com"), Role.member());
    const firstAcceptingUserId = UserId.generate();
    invitation.accept(firstAcceptingUserId);
    await invitationRepository.save(invitation);

    await assert.rejects(
      () => useCase.execute({ invitationId: invitation.id, acceptingUserId: UserId.generate() }),
      InvitationNotPendingError,
    );
  });

  test("publica el evento InvitationAccepted", async () => {
    const invitation = family.inviteMember(EmailAddress.of("nuevo@ejemplo.com"), Role.member());
    await invitationRepository.save(invitation);
    const acceptingUserId = UserId.generate();

    // limpiamos el bus de eventos antes de ejecutar el caso de uso para asegurarnos de que no haya eventos previos
     invitation.pullDomainEvents();   // ← limpia el MemberInvited generado al crear la invitación

    await useCase.execute({ invitationId: invitation.id, acceptingUserId });

    assert.equal(eventBus.publishedEvents.length, 1);
    assert.ok(eventBus.publishedEvents[0] instanceof InvitationAccepted);
  });
});