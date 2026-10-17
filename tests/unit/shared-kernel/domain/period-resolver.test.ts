// tests/unit/shared-kernel/domain/period-resolver.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { PeriodResolver } from "../../../../src/shared-kernel/domain/period-resolver.js";

describe("PeriodResolver", () => {
  test("resuelve el período usando la zona horaria configurada", () => {
    const resolver = new PeriodResolver("America/Santiago");

    assert.equal(resolver.periodOf(new Date("2026-11-01T02:30:00Z")).toString(), "2026-10");
    assert.equal(resolver.periodOf(new Date("2026-11-01T03:30:00Z")).toString(), "2026-11");
  });
});
