// tests/unit/contexts/financial-tracking/domain/entities/payment-method.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FamilyId } from "../../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { PaymentMethod } from "../../../../../../src/contexts/financial-tracking/domain/entities/payment-method.js";
import { CategoryStatus } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/category-status.js";
import { PaymentMethodName } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-name.js";

describe("PaymentMethod", () => {
  const familyId = FamilyId.generate();
  const name = PaymentMethodName.of("Efectivo");

  it("crea un medio de pago activo para una familia", () => {
    const paymentMethod = PaymentMethod.create(familyId, name);

    assert.equal(paymentMethod.status, CategoryStatus.Active);
    assert.ok(paymentMethod.familyId.equals(familyId));
    assert.ok(paymentMethod.name.equals(name));
  });

  it("genera un identificador único", () => {
    const first = PaymentMethod.create(familyId, name);
    const second = PaymentMethod.create(familyId, name);

    assert.ok(!first.id.equals(second.id));
  });

  it("reconstituye un medio de pago sin cambiar sus datos", () => {
    const paymentMethod = PaymentMethod.reconstitute({
      id: "123e4567-e89b-12d3-a456-426614174000",
      familyId: familyId.toString(),
      name: "  Tarjeta  ",
      status: "DEPRECATED",
    });

    assert.equal(paymentMethod.id.toString(), "123e4567-e89b-12d3-a456-426614174000");
    assert.equal(paymentMethod.name.toString(), "Tarjeta");
    assert.equal(paymentMethod.status, CategoryStatus.Deprecated);
  });

  it("permite renombrar el medio de pago", () => {
    const paymentMethod = PaymentMethod.create(familyId, name);

    paymentMethod.rename(PaymentMethodName.of("Tarjeta"));

    assert.equal(paymentMethod.name.toString(), "Tarjeta");
  });

  it("permite deprecar y reactivar el medio de pago", () => {
    const paymentMethod = PaymentMethod.create(familyId, name);

    paymentMethod.deprecate();
    assert.equal(paymentMethod.status, CategoryStatus.Deprecated);

    paymentMethod.reactivate();
    assert.equal(paymentMethod.status, CategoryStatus.Active);
  });
});
