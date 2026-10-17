import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Currency } from "../../../../src/shared-kernel/domain/currency.js";
import { Money } from "../../../../src/shared-kernel/domain/money.js";

describe("Money", () => {
  const clp = Currency.of("CLP");
  const usd = Currency.of("USD");

  describe("of()", () => {
    it("crea instancia para monto cero", () => {
      assert.doesNotThrow(() => Money.of(0, clp));
    });

    it("crea instancia para monto positivo", () => {
      assert.doesNotThrow(() => Money.of(1000, clp));
    });

    it("lanza InvalidAmountError para importes no enteros o inseguros", () => {
      assert.throws(() => Money.of(1.5, clp), { name: "InvalidAmountError" });
      assert.throws(() => Money.of(Number.NaN, clp), { name: "InvalidAmountError" });
      assert.throws(() => Money.of(Number.POSITIVE_INFINITY, clp), {
        name: "InvalidAmountError",
      });
      assert.throws(() => Money.of(Number.MAX_SAFE_INTEGER + 1, clp), {
        name: "InvalidAmountError",
      });
    });
  });

  describe("add()", () => {
    it("suma dos montos con la misma moneda", () => {
      const a = Money.of(100, clp);
      const b = Money.of(200, clp);
      const result = a.add(b);
      assert.ok(result.isGreaterThan(a));
    });

    it("suma montos creados con instancias equivalentes de la misma moneda", () => {
      const result = Money.of(100, Currency.of("CLP")).add(Money.of(200, Currency.of("CLP")));

      assert.equal(result.amount, 300);
    });

    it("lanza CurrencyMismatchError al sumar monedas distintas", () => {
      assert.throws(() => Money.of(100, clp).add(Money.of(100, usd)), {
        name: "CurrencyMismatchError",
      });
    });

    it("suma unidades menores sin introducir decimales", () => {
      assert.equal(Money.ofMinor(10, usd).add(Money.ofMinor(20, usd)).minorUnits, 30);
    });
  });

  describe("isGreaterThan()", () => {
    it("retorna true cuando el monto es mayor", () => {
      assert.ok(Money.of(200, clp).isGreaterThan(Money.of(100, clp)));
    });

    it("retorna false cuando los montos son iguales", () => {
      assert.ok(!Money.of(100, clp).isGreaterThan(Money.of(100, clp)));
    });

    it("retorna false cuando el monto es menor", () => {
      assert.ok(!Money.of(50, clp).isGreaterThan(Money.of(100, clp)));
    });

    it("lanza CurrencyMismatchError al comparar monedas distintas", () => {
      assert.throws(() => Money.of(100, clp).isGreaterThan(Money.of(50, usd)), {
        name: "CurrencyMismatchError",
      });
    });
  });

  describe("operaciones exactas", () => {
    it("permite restar y obtener un saldo negativo", () => {
      const result = Money.ofMinor(10, usd).subtract(Money.ofMinor(20, usd));

      assert.equal(result.minorUnits, -10);
      assert.equal(result.isPositive(), false);
      assert.equal(result.isZero(), false);
    });

    it("compara igualdad por unidades y moneda", () => {
      assert.equal(Money.ofMinor(1599, usd).equals(Money.ofMinor(1599, Currency.of("USD"))), true);
      assert.equal(Money.ofMinor(1599, usd).equals(Money.ofMinor(1600, usd)), false);
    });

    it("serializa un DTO Money", () => {
      assert.deepEqual(Money.ofMinor(1599, usd).toDto(), { amount: 1599, currency: "USD" });
    });
  });
});
