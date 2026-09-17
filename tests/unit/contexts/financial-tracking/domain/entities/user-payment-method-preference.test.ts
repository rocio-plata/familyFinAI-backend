// tests/contexts/financial-tracking/domain/entities/user-payment-method-preference.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { UserPaymentMethodPreference } from "../../../../../src/contexts/financial-tracking/domain/entities/user-payment-method-preference.js";
import { PaymentMethodId } from "../../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-id.js";

describe("UserPaymentMethodPreference", () => {
  const userId = UserId.generate();
  const familyId = FamilyId.generate();
  const defaultPaymentMethodId = PaymentMethodId.generate();

  it("crea una preferencia identificada por usuario y familia", () => {
    const preference = UserPaymentMethodPreference.create(userId, familyId, defaultPaymentMethodId);

    assert.ok(preference.userId.equals(userId));
    assert.ok(preference.familyId.equals(familyId));
    assert.ok(preference.defaultPaymentMethodId.equals(defaultPaymentMethodId));
  });

  it("permite cambiar el medio de pago predeterminado", () => {
    const preference = UserPaymentMethodPreference.create(userId, familyId, defaultPaymentMethodId);
    const newDefaultPaymentMethodId = PaymentMethodId.generate();

    preference.changeDefault(newDefaultPaymentMethodId);

    assert.ok(preference.defaultPaymentMethodId.equals(newDefaultPaymentMethodId));
  });

  it("reconstituye una preferencia desde sus identificadores", () => {
    const preference = UserPaymentMethodPreference.reconstitute({
      userId: userId.toString(),
      familyId: familyId.toString(),
      defaultPaymentMethodId: defaultPaymentMethodId.toString(),
    });

    assert.ok(preference.userId.equals(userId));
    assert.ok(preference.familyId.equals(familyId));
    assert.ok(preference.defaultPaymentMethodId.equals(defaultPaymentMethodId));
  });
});
