import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Family } from "../../../../../src/contexts/family-access/domain/entities/family.js";
import { CannotRemoveLastOwnerError } from "../../../../../src/contexts/family-access/domain/errors/cannot-remove-last-owner.error.js";
import { InsufficientRoleError } from "../../../../../src/contexts/family-access/domain/errors/insufficient-role.error.js";
import { MemberRoleChanged } from "../../../../../src/contexts/family-access/domain/events/member-role-changed.event.js";
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

  describe("Family.changeRole", () => {
    it("cambia el rol de un miembro cuando quien ejecuta es Owner", () => {
      const ownerId = UserId.generate();
      const memberId = UserId.generate();
      const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
      family.addMemberFromInvitationData(memberId, Role.member());

      family.changeRole(memberId, Role.owner(), ownerId); // ← agregado el tercer argumento

      assert.ok(family.findMembership(memberId)?.role.isOwner());
    });

    it("lanza InsufficientRoleError si quien cambia el rol no es Owner", () => {
      const ownerId = UserId.generate();
      const nonOwnerId = UserId.generate();
      const targetId = UserId.generate();
      const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
      family.addMemberFromInvitationData(nonOwnerId, Role.member());
      family.addMemberFromInvitationData(targetId, Role.member());

      assert.throws(
        () => family.changeRole(targetId, Role.owner(), nonOwnerId), // ← nuevo caso, antes no existía esta validación
        InsufficientRoleError,
      );
    });

    it("lanza CannotRemoveLastOwnerError al degradar al último Owner", () => {
      const ownerId = UserId.generate();
      const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);

      assert.throws(
        () => family.changeRole(ownerId, Role.member(), ownerId),
        CannotRemoveLastOwnerError,
      );
    });

    it("publica MemberRoleChanged al cambiar el rol", () => {
      const ownerId = UserId.generate();
      const memberId = UserId.generate();
      const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
      family.addMemberFromInvitationData(memberId, Role.member());
      family.pullDomainEvents();

      family.changeRole(memberId, Role.owner(), ownerId);

      const events = family.pullDomainEvents();
      assert.equal(events.length, 1);
      assert.ok(events[0] instanceof MemberRoleChanged);
    });
  });
});
