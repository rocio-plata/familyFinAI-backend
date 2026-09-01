// tests/contexts/family-access/remove-member.usecase.test.ts

import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { RemoveMemberUseCase } from "../../../src/contexts/family-access/application/commands/remove-member.usecase.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { CannotRemoveLastOwnerError } from "../../../src/contexts/family-access/domain/errors/cannot-remove-last-owner.error.js";
import { FamilyNotFoundError } from "../../../src/contexts/family-access/domain/errors/family-not-found.error.js";
import { InsufficientRoleError } from "../../../src/contexts/family-access/domain/errors/insufficient-role.error.js";
import { MemberNotFoundError } from "../../../src/contexts/family-access/domain/errors/member-not-found.error.js";
import { MemberRemoved } from "../../../src/contexts/family-access/domain/events/member-removed.event.js";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";
import { InMemoryFamilyRepository } from "./doubles/in-memory-family.repository.js";

describe("RemoveMemberUseCase", () => {
  let familyRepository: InMemoryFamilyRepository;
  let eventBus: FakeEventBus;
  let useCase: RemoveMemberUseCase;
  let ownerId: UserId;
  let family: Family;

  beforeEach(async () => {
    familyRepository = new InMemoryFamilyRepository();
    eventBus = new FakeEventBus();
    useCase = new RemoveMemberUseCase(familyRepository, eventBus);

    ownerId = UserId.generate();
    family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.pullDomainEvents(); // limpia el FamilyCreated del setup, mismo patrón aprendido con AcceptInvitation
    await familyRepository.save(family);
  });

  test("remueve a un miembro cuando quien ejecuta es Owner", async () => {
    const memberId = UserId.generate();
    family.addMemberFromInvitationData(memberId, Role.member());
    await familyRepository.save(family);

    await useCase.execute({ familyId: family.id, memberId, removedBy: ownerId });

    const updatedFamily = await familyRepository.findById(family.id);
    assert.equal(updatedFamily?.findMembership(memberId), null);
  });

  test("rechaza si la familia no existe", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId: FamilyId.generate(),
          memberId: UserId.generate(),
          removedBy: ownerId,
        }),
      FamilyNotFoundError,
    );
  });

  test("rechaza si quien remueve no es Owner", async () => {
    const nonOwnerId = UserId.generate();
    const targetId = UserId.generate();
    family.addMemberFromInvitationData(nonOwnerId, Role.member());
    family.addMemberFromInvitationData(targetId, Role.member());
    await familyRepository.save(family);

    await assert.rejects(
      () => useCase.execute({ familyId: family.id, memberId: targetId, removedBy: nonOwnerId }),
      InsufficientRoleError,
    );
  });

  test("rechaza remover al último Owner", async () => {
    await assert.rejects(
      () => useCase.execute({ familyId: family.id, memberId: ownerId, removedBy: ownerId }),
      CannotRemoveLastOwnerError,
    );
  });

  test("rechaza si el miembro a remover no existe en la familia", async () => {
    await assert.rejects(
      () =>
        useCase.execute({ familyId: family.id, memberId: UserId.generate(), removedBy: ownerId }),
      MemberNotFoundError,
    );
  });

  test("publica el evento MemberRemoved", async () => {
    const memberId = UserId.generate();
    family.addMemberFromInvitationData(memberId, Role.member());
    await familyRepository.save(family);

    await useCase.execute({ familyId: family.id, memberId, removedBy: ownerId });

    assert.equal(eventBus.publishedEvents.length, 1);
    assert.ok(eventBus.publishedEvents[0] instanceof MemberRemoved);
  });
});
