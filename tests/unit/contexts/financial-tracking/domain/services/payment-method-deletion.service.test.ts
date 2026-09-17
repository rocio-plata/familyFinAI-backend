// tests/contexts/financial-tracking/domain/services/payment-method-deletion.service.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { PaymentMethod } from "../../../../../src/contexts/financial-tracking/domain/entities/payment-method.js";
import { PaymentMethodHasAssociatedItemsError } from "../../../../../src/contexts/financial-tracking/domain/errors/payment-method-has-associated-items.error.js";
import { PaymentMethodDeletionService } from "../../../../../src/contexts/financial-tracking/domain/services/payment-method-deletion.service.js";
import { PaymentMethodName } from "../../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-name.js";
import { FakePaymentMethodItemAssociationReader } from "../../doubles/fake-payment-method-item-association-reader.js";

describe("PaymentMethodDeletionService", () => {
  test("permite eliminar un medio sin items asociados", async () => {
    const reader = new FakePaymentMethodItemAssociationReader();
    const service = new PaymentMethodDeletionService(reader);
    const paymentMethod = PaymentMethod.create(
      FamilyId.generate(),
      PaymentMethodName.of("Efectivo"),
    );

    await service.delete(paymentMethod);

    assert.equal(paymentMethod.name.toString(), "Efectivo");
  });

  test("rechaza eliminar un medio con items asociados", async () => {
    const reader = new FakePaymentMethodItemAssociationReader();
    const service = new PaymentMethodDeletionService(reader);
    const paymentMethod = PaymentMethod.create(
      FamilyId.generate(),
      PaymentMethodName.of("Efectivo"),
    );
    reader.setItemCount(paymentMethod.id, 1);

    await assert.rejects(
      () => service.delete(paymentMethod),
      new PaymentMethodHasAssociatedItemsError(paymentMethod.id.toString()),
    );
  });
});
