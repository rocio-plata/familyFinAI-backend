import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Family } from "../../../../../src/contexts/family-access/domain/entities/family.js";
import { EmailAddress } from "../../../../../src/contexts/family-access/domain/value-objects/email-address.js";
import { FamilyName } from "../../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { InvitationStatus } from "../../../../../src/contexts/family-access/domain/value-objects/invitation-status.js";
import { Role } from "../../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../../src/contexts/family-access/domain/value-objects/user-id.js";

const familyName = FamilyName.of("Los García");

function makeFamily() {
  const creator = UserId.generate();
  return { family: Family.create(familyName, creator), creator };
}

function addMember(family: Family, role: Role): UserId {
  const newUserId = UserId.generate();
  const inv = family.inviteMember(
    EmailAddress.of(`${newUserId.toString().slice(0, 8)}@test.com`),
    role,
  );
  inv.accept(newUserId);
  family.addMemberFromInvitation(inv);
  return newUserId;
}

describe("Family", () => {
  describe("create()", () => {
    it("incluye al creador como único miembro", () => {
      const { family } = makeFamily();
      assert.equal(family.members.length, 1);
    });

    it("el creador tiene rol Owner", () => {
      const { family, creator } = makeFamily();
      assert.ok(family.findMembership(creator)?.role.isOwner());
    });

    it("almacena el nombre de la familia", () => {
      const { family } = makeFamily();
      assert.strictEqual(family.name, familyName);
    });
  });

  describe("inviteMember()", () => {
    it("crea una invitación pendiente", () => {
      const { family } = makeFamily();
      const inv = family.inviteMember(EmailAddress.of("nuevo@example.com"), Role.member());
      assert.equal(inv.status, InvitationStatus.Pending);
    });
  });

  describe("addMemberFromInvitation()", () => {
    it("agrega el nuevo miembro a la familia", () => {
      const { family } = makeFamily();
      addMember(family, Role.member());
      assert.equal(family.members.length, 2);
    });
  });

  describe("removeMember()", () => {
    it("el owner puede eliminar un miembro", () => {
      const { family, creator } = makeFamily();
      const memberId = addMember(family, Role.member());
      family.removeMember(memberId, creator);
      assert.equal(family.members.length, 1);
    });

    it("lanza InsufficientRoleError si quien elimina no es owner", () => {
      const { family } = makeFamily();
      const memberId = addMember(family, Role.member());
      const otherMember = addMember(family, Role.member());
      assert.throws(() => family.removeMember(memberId, otherMember), {
        name: "InsufficientRoleError",
      });
    });

    it("lanza CannotRemoveLastOwnerError al intentar eliminar el único owner", () => {
      const { family, creator } = makeFamily();
      assert.throws(() => family.removeMember(creator, creator), {
        name: "CannotRemoveLastOwnerError",
      });
    });
  });

  describe("changeRole()", () => {
    it("cambia el rol de un miembro existente", () => {
      const { family } = makeFamily();
      const memberId = addMember(family, Role.member());
      family.changeRole(memberId, Role.owner());
      assert.ok(family.findMembership(memberId)?.role.isOwner());
    });

    it("lanza CannotRemoveLastOwnerError al degradar al único owner", () => {
      const { family, creator } = makeFamily();
      assert.throws(() => family.changeRole(creator, Role.member()), {
        name: "CannotRemoveLastOwnerError",
      });
    });

    it("lanza MemberNotFoundError para un userId inexistente", () => {
      const { family } = makeFamily();
      assert.throws(() => family.changeRole(UserId.generate(), Role.member()), {
        name: "MemberNotFoundError",
      });
    });
  });
});
