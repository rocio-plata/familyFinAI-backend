// tests/contexts/financial-tracking/infrastructure/persistence/in-memory-payment-method.repository.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { PaymentMethod } from "../../../../../src/contexts/financial-tracking/domain/entities/payment-method.js";
import { UserPaymentMethodPreference } from "../../../../../src/contexts/financial-tracking/domain/entities/user-payment-method-preference.js";
import { PaymentMethodName } from "../../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-name.js";
import { InMemoryPaymentMethodRepository } from "../../../../../src/contexts/financial-tracking/infrastructure/persistence/in-memory-payment-method.repository.js";
import { InMemoryUserPaymentMethodPreferenceRepository } from "../../../../../src/contexts/financial-tracking/infrastructure/persistence/in-memory-user-payment-method-preference.repository.js";

describe("InMemoryPaymentMethodRepository de infraestructura", () => {
  test("guarda, busca por id y filtra por familia", async () => {
    const repository = new InMemoryPaymentMethodRepository();
    const familyId = FamilyId.generate();
    const otherFamilyId = FamilyId.generate();
    const paymentMethod = PaymentMethod.create(familyId, PaymentMethodName.of("Efectivo"));
    const otherPaymentMethod = PaymentMethod.create(
      otherFamilyId,
      PaymentMethodName.of("Efectivo"),
    );

    await repository.save(paymentMethod);
    await repository.save(otherPaymentMethod);

    assert.equal(await repository.findById(paymentMethod.id), paymentMethod);
    assert.deepEqual(await repository.findByFamilyId(familyId), [paymentMethod]);
  });

  test("actualiza una entidad existente al guardarla de nuevo", async () => {
    const repository = new InMemoryPaymentMethodRepository();
    const paymentMethod = PaymentMethod.create(
      FamilyId.generate(),
      PaymentMethodName.of("Efectivo"),
    );

    await repository.save(paymentMethod);
    paymentMethod.rename(PaymentMethodName.of("Caja chica"));
    await repository.save(paymentMethod);

    assert.equal((await repository.findByFamilyId(paymentMethod.familyId)).length, 1);
    assert.equal((await repository.findById(paymentMethod.id))?.name.toString(), "Caja chica");
  });

  test("elimina por id y tolera borrar un id inexistente", async () => {
    const repository = new InMemoryPaymentMethodRepository();
    const paymentMethod = PaymentMethod.create(
      FamilyId.generate(),
      PaymentMethodName.of("Efectivo"),
    );

    await repository.save(paymentMethod);
    await repository.delete(paymentMethod.id);
    await repository.delete(paymentMethod.id);

    assert.equal(await repository.findById(paymentMethod.id), null);
  });
});

describe("InMemoryUserPaymentMethodPreferenceRepository de infraestructura", () => {
  test("hace upsert por usuario y familia", async () => {
    const repository = new InMemoryUserPaymentMethodPreferenceRepository();
    const userId = UserId.generate();
    const familyId = FamilyId.generate();
    const firstPaymentMethodId = PaymentMethod.create(
      familyId,
      PaymentMethodName.of("Efectivo"),
    ).id;
    const secondPaymentMethodId = PaymentMethod.create(
      familyId,
      PaymentMethodName.of("Transferencia"),
    ).id;
    const preference = UserPaymentMethodPreference.create(userId, familyId, firstPaymentMethodId);

    await repository.save(preference);
    preference.changeDefault(secondPaymentMethodId);
    await repository.save(preference);

    assert.equal(
      (await repository.findByUserAndFamily(userId, familyId))?.defaultPaymentMethodId,
      secondPaymentMethodId,
    );
  });

  test("detecta y elimina preferencias que apuntan a un medio", async () => {
    const repository = new InMemoryUserPaymentMethodPreferenceRepository();
    const userId = UserId.generate();
    const familyId = FamilyId.generate();
    const paymentMethodId = PaymentMethod.create(familyId, PaymentMethodName.of("Efectivo")).id;
    const preference = UserPaymentMethodPreference.create(userId, familyId, paymentMethodId);

    await repository.save(preference);
    assert.equal(await repository.existsAnyForPaymentMethod(paymentMethodId), true);

    await repository.delete(userId, familyId);
    await repository.delete(userId, familyId);

    assert.equal(await repository.findByUserAndFamily(userId, familyId), null);
    assert.equal(await repository.existsAnyForPaymentMethod(paymentMethodId), false);
  });
});
