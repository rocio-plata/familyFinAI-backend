// tests/integration/contexts/family-access/infrastructure/persistence/family.repository.test.ts
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { Family } from "../../../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { DrizzleFamilyRepository } from "../../../../../../src/contexts/family-access/infrastructure/persistence/drizzle-family.repository.js";
import { families } from "../../../../../../src/contexts/family-access/infrastructure/persistence/schema.js";
import { db } from "../../../../../../src/platform/db/connection.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const skip = hasDatabase ? false : "requiere DATABASE_URL";

const familyRepository = new DrizzleFamilyRepository();
const createdFamilyIds: string[] = [];

after(async () => {
  if (!hasDatabase) return;
  for (const id of createdFamilyIds) {
    await db.delete(families).where(eq(families.id, id));
  }
});

describe("Persistencia Drizzle de familias (integración)", () => {
  test("guarda una familia con su owner y la recupera con sus miembros", { skip }, async () => {
    const creator = UserId.generate();
    const family = Family.create(FamilyName.of("Familia integración"), creator);
    createdFamilyIds.push(family.id.toString());

    await familyRepository.save(family);

    const found = await familyRepository.findById(family.id);
    assert.ok(found);
    assert.equal(found.name.toString(), "Familia integración");
    assert.equal(found.members.length, 1);
    assert.ok(found.members[0]?.role.isOwner());
  });

  test("agrega un miembro y lo encuentra por findAllByMemberUserId", { skip }, async () => {
    const creator = UserId.generate();
    const newMember = UserId.generate();
    const family = Family.create(FamilyName.of("Familia con miembros"), creator);
    createdFamilyIds.push(family.id.toString());
    family.addMemberFromInvitationData(newMember, Role.member());
    await familyRepository.save(family);

    const updated = await familyRepository.findById(family.id);
    assert.equal(updated?.members.length, 2);

    const foundByMember = await familyRepository.findAllByMemberUserId(newMember);
    assert.equal(foundByMember.length, 1);
    assert.ok(foundByMember[0]?.id.equals(family.id));
  });
});
