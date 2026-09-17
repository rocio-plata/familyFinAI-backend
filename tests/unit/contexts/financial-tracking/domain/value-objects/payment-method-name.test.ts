// tests/unit/contexts/financial-tracking/domain/value-objects/payment-method-name.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InvalidPaymentMethodNameError } from "../../../../../../src/contexts/financial-tracking/domain/errors/invalid-payment-method-name.error.js";
import { PaymentMethodName } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-name.js";

describe("PaymentMethodName", () => {
  it("crea una instancia para nombre válido", () => {
    assert.doesNotThrow(() => PaymentMethodName.of("Efectivo"));
  });

  it("elimina espacios al inicio y final", () => {
    assert.equal(PaymentMethodName.of("  Efectivo  ").toString(), "Efectivo");
  });

  it("rechaza un nombre vacío", () => {
    assert.throws(() => PaymentMethodName.of(""), InvalidPaymentMethodNameError);
  });

  it("rechaza un nombre de más de 40 caracteres", () => {
    assert.throws(() => PaymentMethodName.of("a".repeat(41)), InvalidPaymentMethodNameError);
  });

  it("acepta un nombre de exactamente 40 caracteres", () => {
    assert.doesNotThrow(() => PaymentMethodName.of("a".repeat(40)));
  });

  it("compara nombres sin distinguir mayúsculas", () => {
    assert.ok(PaymentMethodName.of("Efectivo").equals(PaymentMethodName.of("efectivo")));
  });
});
