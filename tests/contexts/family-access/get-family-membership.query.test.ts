// tests/contexts/family-access/get-family-membership.query.test.ts
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GetFamilyMembershipQuery } from "../../../src/contexts/family-access/application/queries/get-family-membership.query.js";
import { InMemoryFamilyRepository } from "./doubles/in-memory-family.repository.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";

describe("GetFamilyMembershipQuery", () => {
  let familyRepository: InMemoryFamilyRepository;
  let query: GetFamilyMembershipQuery;
  let ownerId: UserId;
  let family: Family;

  beforeEach(async () => {
    familyRepository = new InMemoryFamilyRepository();
    query = new GetFamilyMembershipQuery(familyRepository);

    ownerId = UserId.generate();
    family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.pullDomainEvents();
    await familyRepository.save(family);
  });

  test("devuelve la membresía cuando el usuario pertenece a la familia", async () => {
    const result = await query.execute({ familyId: family.id, userId: ownerId });

    assert.ok(result !== null);
    assert.ok(result?.role.isOwner());
    assert.ok(result?.familyId.equals(family.id));
    assert.ok(result?.userId.equals(ownerId));
  });

  test("devuelve null cuando el usuario no pertenece a la familia", async () => {
    const result = await query.execute({ familyId: family.id, userId: UserId.generate() });

    assert.equal(result, null);
  });

  test("devuelve null cuando la familia no existe", async () => {
    const result = await query.execute({ familyId: FamilyId.generate(), userId: ownerId });

    assert.equal(result, null);
  });
});