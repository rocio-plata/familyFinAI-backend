// tests/contexts/family-access/change-member-role.usecase.test.ts

import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { ChangeMemberRoleUseCase } from "../../../src/contexts/family-access/application/commands/change-member-role.usecase.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { CannotRemoveLastOwnerError } from "../../../src/contexts/family-access/domain/errors/cannot-remove-last-owner.error.js";
import { FamilyNotFoundError } from "../../../src/contexts/family-access/domain/errors/family-not-found.error.js";
import { InsufficientRoleError } from "../../../src/contexts/family-access/domain/errors/insufficient-role.error.js";
import { MemberNotFoundError } from "../../../src/contexts/family-access/domain/errors/member-not-found.error.js";
import { MemberRoleChanged } from "../../../src/contexts/family-access/domain/events/member-role-changed.event.js";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";
import { InMemoryFamilyRepository } from "./doubles/in-memory-family.repository.js";

describe("ChangeMemberRoleUseCase", () => {
  let familyRepository: InMemoryFamilyRepository;
  let eventBus: FakeEventBus;
  let useCase: ChangeMemberRoleUseCase;
  let ownerId: UserId;
  let family: Family;

  beforeEach(async () => {
    familyRepository = new InMemoryFamilyRepository();
    eventBus = new FakeEventBus();
    useCase = new ChangeMemberRoleUseCase(familyRepository, eventBus);

    ownerId = UserId.generate();
    family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.pullDomainEvents();
    await familyRepository.save(family);
  });

  test("cambia el rol de un miembro cuando quien ejecuta es Owner", async () => {
    const memberId = UserId.generate();
    family.addMemberFromInvitationData(memberId, Role.member());
    await familyRepository.save(family);

    await useCase.execute({
      familyId: family.id,
      memberId,
      newRole: Role.owner(),
      changedBy: ownerId,
    });

    const updatedFamily = await familyRepository.findById(family.id);
    assert.ok(updatedFamily?.findMembership(memberId)?.role.isOwner());
  });

  test("rechaza si la familia no existe", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId: FamilyId.generate(),
          memberId: UserId.generate(),
          newRole: Role.owner(),
          changedBy: ownerId,
        }),
      FamilyNotFoundError,
    );
  });

  test("rechaza si quien cambia el rol no es Owner", async () => {
    const nonOwnerId = UserId.generate();
    const targetId = UserId.generate();
    family.addMemberFromInvitationData(nonOwnerId, Role.member());
    family.addMemberFromInvitationData(targetId, Role.member());
    await familyRepository.save(family);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId: family.id,
          memberId: targetId,
          newRole: Role.owner(),
          changedBy: nonOwnerId,
        }),
      InsufficientRoleError,
    );
  });

  test("rechaza degradar al último Owner a Member", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId: family.id,
          memberId: ownerId,
          newRole: Role.member(),
          changedBy: ownerId,
        }),
      CannotRemoveLastOwnerError,
    );
  });

  test("rechaza si el miembro objetivo no existe en la familia", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId: family.id,
          memberId: UserId.generate(),
          newRole: Role.owner(),
          changedBy: ownerId,
        }),
      MemberNotFoundError,
    );
  });

  test("publica el evento MemberRoleChanged", async () => {
    const memberId = UserId.generate();
    family.addMemberFromInvitationData(memberId, Role.member());
    await familyRepository.save(family);

    await useCase.execute({
      familyId: family.id,
      memberId,
      newRole: Role.owner(),
      changedBy: ownerId,
    });

    assert.equal(eventBus.publishedEvents.length, 1);
    assert.ok(eventBus.publishedEvents[0] instanceof MemberRoleChanged);
  });
});
