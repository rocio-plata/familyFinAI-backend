// tests/unit/contexts/financial-tracking/domain/value-objects/payment-method-id.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InvalidPaymentMethodIdError } from "../../../../../../src/contexts/financial-tracking/domain/errors/invalid-id.error.js";
import { PaymentMethodId } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-id.js";

describe("PaymentMethodId", () => {
  it("genera un identificador válido", () => {
    const id = PaymentMethodId.generate();

    assert.doesNotThrow(() => PaymentMethodId.of(id.toString()));
  });

  it("rechaza un UUID inválido", () => {
    assert.throws(() => PaymentMethodId.of("not-a-uuid"), InvalidPaymentMethodIdError);
  });

  it("compara identificadores por su valor", () => {
    const id = PaymentMethodId.generate();

    assert.ok(id.equals(PaymentMethodId.of(id.toString())));
  });
});
