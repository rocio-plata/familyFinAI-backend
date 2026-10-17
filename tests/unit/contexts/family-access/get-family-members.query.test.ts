// tests/unit/contexts/family-access/get-family-members.query.test.ts

import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { GetFamilyMembersQuery } from "../../../../src/contexts/family-access/application/queries/get-family-members.query.js";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyNotFoundError } from "../../../../src/contexts/family-access/domain/errors/family-not-found.error.js";
import { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { InMemoryFamilyRepository } from "./doubles/in-memory-family.repository.js";

describe("GetFamilyMembersQuery", () => {
  let familyRepository: InMemoryFamilyRepository;
  let query: GetFamilyMembersQuery;
  let ownerId: UserId;
  let family: Family;

  beforeEach(async () => {
    familyRepository = new InMemoryFamilyRepository();
    query = new GetFamilyMembersQuery(familyRepository);

    ownerId = UserId.generate();
    family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    await familyRepository.save(family);
  });

  test("devuelve todos los miembros de la familia", async () => {
    const memberId = UserId.generate();
    family.addMemberFromInvitationData(memberId, Role.member());
    await familyRepository.save(family);

    const members = await query.execute({ familyId: family.id });

    assert.equal(members.length, 2);
    assert.ok(members.some((m) => m.userId.equals(ownerId) && m.role.isOwner()));
    assert.ok(members.some((m) => m.userId.equals(memberId) && !m.role.isOwner()));
  });

  test("rechaza si la familia no existe", async () => {
    await assert.rejects(
      () => query.execute({ familyId: FamilyId.generate() }),
      FamilyNotFoundError,
    );
  });

  test("devuelve displayName y email solo para quien consulta como Owner", async () => {
    const memberId = UserId.generate();
    family.addMemberFromInvitationData(memberId, Role.member());
    await familyRepository.save(family);
    const userDirectory = {
      findUserIdByEmail: async () => null,
      findProfilesByIds: async () => [
        { userId: ownerId, displayName: "Rocío", email: "rocio@example.com" },
        { userId: memberId, displayName: "Alex", email: "alex@example.com" },
      ],
    };
    query = new GetFamilyMembersQuery(familyRepository, userDirectory);

    const members = await query.execute({
      familyId: family.id,
      requestedBy: ownerId,
      requestedByRole: Role.owner(),
    });

    assert.equal(
      members.find((member) => member.userId.equals(ownerId))?.email,
      "rocio@example.com",
    );
    assert.equal(members.find((member) => member.userId.equals(memberId))?.displayName, "Alex");
  });

  test("oculta el email cuando quien consulta es Member y tolera perfiles ausentes", async () => {
    const memberId = UserId.generate();
    family.addMemberFromInvitationData(memberId, Role.member());
    await familyRepository.save(family);
    const userDirectory = {
      findUserIdByEmail: async () => null,
      findProfilesByIds: async () => [],
    };
    query = new GetFamilyMembersQuery(familyRepository, userDirectory);

    const members = await query.execute({
      familyId: family.id,
      requestedBy: memberId,
      requestedByRole: Role.member(),
    });

    assert.equal(members[0]?.displayName, null);
    assert.equal("email" in (members[0] ?? {}), false);
  });
});
