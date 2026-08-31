import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Member } from "../../../../../src/contexts/family-access/domain/entities/member.js";
import { Role } from "../../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../../src/contexts/family-access/domain/value-objects/user-id.js";

describe("Member", () => {
  const userId = UserId.generate();

  describe("createOwner()", () => {
    it("crea un miembro con rol Owner", () => {
      assert.ok(Member.createOwner(userId).role.isOwner());
    });

    it("asigna el userId correcto", () => {
      assert.ok(Member.createOwner(userId).userId.equals(userId));
    });

    it("joinedAt es una fecha reciente", () => {
      const before = new Date();
      const member = Member.createOwner(userId);
      assert.ok(member.joinedAt >= before);
    });
  });

  describe("create()", () => {
    it("crea un miembro con el rol proporcionado", () => {
      const member = Member.create(userId, Role.member());
      assert.ok(!member.role.isOwner());
    });
  });

  describe("changeRole()", () => {
    it("actualiza el rol", () => {
      const member = Member.createOwner(userId);
      member.changeRole(Role.member());
      assert.ok(!member.role.isOwner());
    });

    it("puede promover un miembro a Owner", () => {
      const member = Member.create(userId, Role.member());
      member.changeRole(Role.owner());
      assert.ok(member.role.isOwner());
    });
  });
});
