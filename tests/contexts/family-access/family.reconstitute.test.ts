// tests/contexts/family-access/family.reconstitute.test.ts

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";

describe("Family.reconstitute", () => {
  test("reconstruye el agregado con el estado exacto que se le pasa", () => {
    const familyId = FamilyId.generate();
    const ownerId = UserId.generate();
    const memberId = UserId.generate();
    const createdAt = new Date("2026-01-15T10:00:00Z");
    const joinedAtOwner = new Date("2026-01-15T10:00:00Z");
    const joinedAtMember = new Date("2026-02-01T09:00:00Z");

    const family = Family.reconstitute({
      id: familyId.toString(),
      name: "Familia Pérez",
      defaultCurrency: "USD",
      createdBy: ownerId.toString(),
      createdAt,
      members: [
        { userId: ownerId.toString(), role: "OWNER", joinedAt: joinedAtOwner, displayOrder: null },
        { userId: memberId.toString(), role: "MEMBER", joinedAt: joinedAtMember, displayOrder: 2 },
      ],
    });

    assert.ok(family.id.equals(familyId));
    assert.equal(family.name.toString(), "Familia Pérez");
    assert.equal(family.defaultCurrency.toString(), "USD");
    assert.equal(family.createdAt.getTime(), createdAt.getTime());
    assert.equal(family.members.length, 2);

    const owner = family.findMembership(ownerId);
    assert.ok(owner?.role.isOwner());
    assert.equal(owner?.displayOrder, null);

    const member = family.findMembership(memberId);
    assert.ok(!member?.role.isOwner());
    assert.equal(member?.displayOrder, 2);
  });

  test("no dispara ningún evento de dominio al reconstruir", () => {
    const family = Family.reconstitute({
      id: FamilyId.generate().toString(),
      name: "Familia Pérez",
      defaultCurrency: "CLP",
      createdBy: UserId.generate().toString(),
      createdAt: new Date(),
      members: [],
    });

    assert.equal(family.pullDomainEvents().length, 0);
  });

  test("propaga la validación de los Value Objects (ej. moneda inválida)", () => {
    assert.throws(() =>
      Family.reconstitute({
        id: FamilyId.generate().toString(),
        name: "Familia Pérez",
        defaultCurrency: "XYZ", // moneda no soportada
        createdBy: UserId.generate().toString(),
        createdAt: new Date(),
        members: [],
      }),
    );
  });
});
