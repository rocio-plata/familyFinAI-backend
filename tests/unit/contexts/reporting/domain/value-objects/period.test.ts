import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Period } from "../../../../../src/shared-kernel/domain/period.js";

describe("Period compartido", () => {
  it("crea un período mensual válido", () => {
    const period = Period.of(2026, 9);

    assert.equal(period.toString(), "2026-09");
  });

  it("rechaza un mes fuera del rango válido", () => {
    assert.throws(() => Period.of(2026, 13), {
      name: "InvalidPeriodError",
    });
  });

  it("convierte una fecha al período correspondiente", () => {
    const period = Period.fromDate(new Date("2026-09-15T12:00:00.000Z"));

    assert.equal(period.toString(), "2026-09");
  });

  it("compara períodos por año y mes", () => {
    assert.ok(Period.of(2026, 9).equals(Period.of(2026, 9)));
    assert.ok(!Period.of(2026, 9).equals(Period.of(2026, 10)));
  });

  it("detecta si un período ocurre después de otro", () => {
    assert.ok(Period.of(2026, 10).isAfter(Period.of(2026, 9)));
    assert.ok(!Period.of(2026, 9).isAfter(Period.of(2026, 10)));
  });

  it("avanza al período siguiente y cambia de año cuando corresponde", () => {
    assert.equal(Period.of(2026, 9).next().toString(), "2026-10");
    assert.equal(Period.of(2026, 12).next().toString(), "2027-01");
  });
});
