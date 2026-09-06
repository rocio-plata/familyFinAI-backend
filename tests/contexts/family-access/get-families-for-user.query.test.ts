// tests/contexts/family-access/get-families-for-user.query.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { GetFamiliesForUserQuery } from "../../../src/contexts/family-access/application/queries/get-families-for-user.query.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { InMemoryFamilyRepository } from "./doubles/in-memory-family.repository.js";

describe("GetFamiliesForUserQuery", () => {
  let familyRepository: InMemoryFamilyRepository;
  let query: GetFamiliesForUserQuery;
  let userId: UserId;

  beforeEach(() => {
    familyRepository = new InMemoryFamilyRepository();
    query = new GetFamiliesForUserQuery(familyRepository);
    userId = UserId.generate();
  });

  test("devuelve lista vacía si el usuario no pertenece a ninguna familia", async () => {
    const families = await query.execute({ userId });

    assert.deepEqual(families, []);
  });

  test("devuelve las familias donde el usuario es miembro, con su rol", async () => {
    const family = Family.create(FamilyName.of("Familia Pérez"), userId);
    await familyRepository.save(family);

    const families = await query.execute({ userId });

    assert.equal(families.length, 1);
    assert.equal(families[0].familyId.toString(), family.id.toString());
    assert.equal(families[0].name, "Familia Pérez");
    assert.ok(families[0].role.isOwner());
  });

  test("ordena por displayOrder ascendente cuando está definido", async () => {
    const familyA = Family.create(FamilyName.of("Familia A"), userId);
    const familyB = Family.create(FamilyName.of("Familia B"), userId);
    familyA.setMemberDisplayOrder(userId, 1);
    familyB.setMemberDisplayOrder(userId, 0);
    await familyRepository.save(familyA);
    await familyRepository.save(familyB);

    const families = await query.execute({ userId });

    assert.deepEqual(
      families.map((f) => f.name),
      ["Familia B", "Familia A"],
    );
  });

  test("las familias sin displayOrder se ordenan por joinedAt, después de las que sí lo tienen", async () => {
    const withOrder = Family.create(FamilyName.of("Con orden"), UserId.generate());
    withOrder.addMemberFromInvitationData(userId, Role.member());
    withOrder.setMemberDisplayOrder(userId, 5);

    const withoutOrderOlder = Family.create(FamilyName.of("Sin orden, más antigua"), userId);

    await new Promise((resolve) => setTimeout(resolve, 2));

    const withoutOrderNewer = Family.create(FamilyName.of("Sin orden, más nueva"), userId);

    await familyRepository.save(withOrder);
    await familyRepository.save(withoutOrderOlder);
    await familyRepository.save(withoutOrderNewer);

    const families = await query.execute({ userId });

    assert.deepEqual(
      families.map((f) => f.name),
      ["Con orden", "Sin orden, más antigua", "Sin orden, más nueva"],
    );
  });
});
