// tests/unit/contexts/financial-tracking/domain/errors/payment-method-errors.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DuplicatePaymentMethodNameError } from "../../../../../../src/contexts/financial-tracking/domain/errors/duplicate-payment-method-name.error.js";
import { NoDefaultPaymentMethodSetError } from "../../../../../../src/contexts/financial-tracking/domain/errors/no-default-payment-method-set.error.js";
import { PaymentMethodHasAssociatedItemsError } from "../../../../../../src/contexts/financial-tracking/domain/errors/payment-method-has-associated-items.error.js";
import { PaymentMethodIsSomeonesDefaultError } from "../../../../../../src/contexts/financial-tracking/domain/errors/payment-method-is-someones-default.error.js";
import { PaymentMethodNotActiveError } from "../../../../../../src/contexts/financial-tracking/domain/errors/payment-method-not-active.error.js";
import { PaymentMethodNotFoundError } from "../../../../../../src/contexts/financial-tracking/domain/errors/payment-method-not-found.error.js";

describe("errores de medios de pago", () => {
  test("DuplicatePaymentMethodNameError expone su código y nombre", () => {
    const error = new DuplicatePaymentMethodNameError("Efectivo");

    assert.equal(error.name, "DuplicatePaymentMethodNameError");
    assert.equal(error.code, "FINANCIAL_TRACKING.DUPLICATE_PAYMENT_METHOD_NAME");
    assert.match(error.message, /Efectivo/);
  });

  test("PaymentMethodNotFoundError identifica el medio inexistente", () => {
    const error = new PaymentMethodNotFoundError("payment-method-id");

    assert.equal(error.name, "PaymentMethodNotFoundError");
    assert.equal(error.code, "FINANCIAL_TRACKING.PAYMENT_METHOD_NOT_FOUND");
    assert.match(error.message, /payment-method-id/);
  });

  test("PaymentMethodNotActiveError identifica el medio inactivo", () => {
    const error = new PaymentMethodNotActiveError("payment-method-id");

    assert.equal(error.name, "PaymentMethodNotActiveError");
    assert.equal(error.code, "FINANCIAL_TRACKING.PAYMENT_METHOD_NOT_ACTIVE");
    assert.match(error.message, /payment-method-id/);
  });

  test("PaymentMethodHasAssociatedItemsError identifica el medio protegido", () => {
    const error = new PaymentMethodHasAssociatedItemsError("payment-method-id");

    assert.equal(error.name, "PaymentMethodHasAssociatedItemsError");
    assert.equal(error.code, "FINANCIAL_TRACKING.PAYMENT_METHOD_HAS_ASSOCIATED_ITEMS");
    assert.match(error.message, /payment-method-id/);
  });

  test("PaymentMethodIsSomeonesDefaultError identifica el medio predeterminado", () => {
    const error = new PaymentMethodIsSomeonesDefaultError("payment-method-id");

    assert.equal(error.name, "PaymentMethodIsSomeonesDefaultError");
    assert.equal(error.code, "FINANCIAL_TRACKING.PAYMENT_METHOD_IS_SOMEONES_DEFAULT");
    assert.match(error.message, /payment-method-id/);
  });

  test("NoDefaultPaymentMethodSetError expone su código y nombre", () => {
    const error = new NoDefaultPaymentMethodSetError();

    assert.equal(error.name, "NoDefaultPaymentMethodSetError");
    assert.equal(error.code, "FINANCIAL_TRACKING.NO_DEFAULT_PAYMENT_METHOD_SET");
    assert.match(error.message, /predeterminado/);
  });
});
