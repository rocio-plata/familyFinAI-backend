import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";

describe("Currency", () => {
  describe("default()", () => {
    it("retorna CLP", () => {
      assert.equal(Currency.default().toString(), "CLP");
    });
  });

  describe("of()", () => {
    it("crea USD", () => {
      assert.doesNotThrow(() => Currency.of("USD"));
    });

    it("crea EUR", () => {
      assert.doesNotThrow(() => Currency.of("EUR"));
    });

    it("crea CLP", () => {
      assert.doesNotThrow(() => Currency.of("CLP"));
    });

    it("lanza UnsupportedCurrencyError para moneda no soportada", () => {
      assert.throws(() => Currency.of("BTC"), { name: "UnsupportedCurrencyError" });
    });

    it("lanza UnsupportedCurrencyError para string vacío", () => {
      assert.throws(() => Currency.of(""), { name: "UnsupportedCurrencyError" });
    });
  });

  describe("equals()", () => {
    it("retorna true para el mismo código de moneda", () => {
      assert.ok(Currency.of("USD").equals(Currency.of("USD")));
    });

    it("retorna false para códigos distintos", () => {
      assert.ok(!Currency.of("USD").equals(Currency.of("EUR")));
    });
  });

  describe("toString()", () => {
    it("devuelve el código de moneda", () => {
      assert.equal(Currency.of("USD").toString(), "USD");
    });
  });
});
