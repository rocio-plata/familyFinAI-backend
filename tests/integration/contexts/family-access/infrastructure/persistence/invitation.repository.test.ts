// tests/integration/contexts/family-access/infrastructure/persistence/invitation.repository.test.ts
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { Family } from "../../../../../../src/contexts/family-access/domain/entities/family.js";
import { Invitation } from "../../../../../../src/contexts/family-access/domain/entities/invitation.js";
import { FamilyName } from "../../../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { DrizzleFamilyRepository } from "../../../../../../src/contexts/family-access/infrastructure/persistence/drizzle-family.repository.js";
import { DrizzleInvitationRepository } from "../../../../../../src/contexts/family-access/infrastructure/persistence/drizzle-invitation.repository.js";
import { families } from "../../../../../../src/contexts/family-access/infrastructure/persistence/schema.js";
import { db } from "../../../../../../src/platform/db/connection.js";
import { EmailAddress } from "../../../../../../src/shared-kernel/domain/email-address.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const skip = hasDatabase ? false : "requiere DATABASE_URL";

const familyRepository = new DrizzleFamilyRepository();
const invitationRepository = new DrizzleInvitationRepository();
const createdFamilyIds: string[] = [];

after(async () => {
  if (!hasDatabase) return;
  // las invitaciones se borran en cascada al eliminar la familia (onDelete: "cascade").
  for (const id of createdFamilyIds) {
    await db.delete(families).where(eq(families.id, id));
  }
});

describe("Persistencia Drizzle de invitaciones (integración)", () => {
  test("guarda, busca y actualiza el estado de una invitación", { skip }, async () => {
    const family = Family.create(FamilyName.of("Familia con invitación"), UserId.generate());
    createdFamilyIds.push(family.id.toString());
    await familyRepository.save(family);

    const invitation = Invitation.create(
      family.id,
      EmailAddress.of("invitada@example.com"),
      Role.member(),
    );

    await invitationRepository.save(invitation);
    const found = await invitationRepository.findById(invitation.id);
    assert.ok(found);
    assert.equal(found.invitedEmail.toString(), "invitada@example.com");
    assert.equal(found.status, "PENDING");

    invitation.accept(UserId.generate());
    await invitationRepository.save(invitation);
    const updated = await invitationRepository.findById(invitation.id);
    assert.equal(updated?.status, "ACCEPTED");

    const byFamily = await invitationRepository.findByFamilyId(family.id);
    assert.equal(byFamily.length, 1);
  });
});
