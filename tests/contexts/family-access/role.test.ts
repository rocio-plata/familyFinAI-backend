// tests/contexts/family-access/role.test.ts

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Role } from "../../../src/contexts/family-access/domain/value-objects/role.js";

describe("Role.satisfies", () => {
  test("Owner satisface un mínimo de Member", () => {
    assert.ok(Role.owner().satisfies(Role.member()));
  });

  test("Owner satisface un mínimo de Owner", () => {
    assert.ok(Role.owner().satisfies(Role.owner()));
  });

  test("Member satisface un mínimo de Member", () => {
    assert.ok(Role.member().satisfies(Role.member()));
  });

  test("Member NO satisface un mínimo de Owner", () => {
    assert.ok(!Role.member().satisfies(Role.owner()));
  });
});
