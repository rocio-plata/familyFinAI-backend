// tests/unit/shared-kernel/domain/percentage.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  calculatePercentage,
  calculateVariation,
} from "../../../../src/shared-kernel/domain/percentage.js";

describe("cálculos porcentuales exactos", () => {
  test("redondea percentage a un decimal sin usar flotantes", () => {
    assert.equal(calculatePercentage(1, 3), 33.3);
    assert.equal(calculatePercentage(0, 0), 0);
  });

  test("redondea variaciones a dos decimales", () => {
    assert.equal(calculateVariation(110, 120), 9.09);
    assert.equal(calculateVariation(100, 90), -10);
    assert.equal(calculateVariation(0, 10), null);
  });
});
