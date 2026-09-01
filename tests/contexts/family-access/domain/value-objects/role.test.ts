import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Role } from "../../../../../src/contexts/family-access/domain/value-objects/role.js";

describe("Role", () => {
  describe("owner()", () => {
    it("isOwner() retorna true", () => {
      assert.ok(Role.owner().isOwner());
    });

    it("canRemoveMembers() retorna true", () => {
      assert.ok(Role.owner().canRemoveMembers());
    });
  });

  describe("member()", () => {
    it("isOwner() retorna false", () => {
      assert.ok(!Role.member().isOwner());
    });

    it("canRemoveMembers() retorna false", () => {
      assert.ok(!Role.member().canRemoveMembers());
    });
  });

  describe("equals()", () => {
    it("retorna true para el mismo tipo de rol", () => {
      assert.ok(Role.owner().equals(Role.owner()));
    });

    it("retorna false para tipos distintos", () => {
      assert.ok(!Role.owner().equals(Role.member()));
    });
  });
});
