// tests/unit/contexts/financial-tracking/create-default-payment-methods.usecase.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { CreateDefaultPaymentMethodsUseCase } from "../../../../src/contexts/financial-tracking/application/commands/create-default-payment-methods.usecase.js";
import { InMemoryPaymentMethodRepository } from "./doubles/in-memory-payment-method.repository.js";
import { InMemoryUserPaymentMethodPreferenceRepository } from "./doubles/in-memory-user-payment-method-preference.repository.js";

describe("CreateDefaultPaymentMethodsUseCase", () => {
  it("crea los cuatro medios y el default del creador en Efectivo", async () => {
    const paymentMethodRepository = new InMemoryPaymentMethodRepository();
    const preferenceRepository = new InMemoryUserPaymentMethodPreferenceRepository();
    const useCase = new CreateDefaultPaymentMethodsUseCase(
      paymentMethodRepository,
      preferenceRepository,
    );
    const familyId = FamilyId.generate();
    const creatorId = UserId.generate();

    await useCase.execute({ familyId, creatorId });

    assert.deepEqual(
      paymentMethodRepository.paymentMethods.map((paymentMethod) => paymentMethod.name.toString()),
      ["Efectivo", "Tarjeta de Débito", "Tarjeta de Crédito", "Transferencia"],
    );
    assert.equal(preferenceRepository.preferences.length, 1);
    const cashPaymentMethod = paymentMethodRepository.paymentMethods.find(
      (paymentMethod) => paymentMethod.name.toString() === "Efectivo",
    );
    const preference = preferenceRepository.preferences[0];
    assert.ok(cashPaymentMethod);
    assert.ok(preference);
    assert.ok(preference.defaultPaymentMethodId.equals(cashPaymentMethod.id));
  });

  it("no duplica medios ni reemplaza el default si se ejecuta nuevamente", async () => {
    const paymentMethodRepository = new InMemoryPaymentMethodRepository();
    const preferenceRepository = new InMemoryUserPaymentMethodPreferenceRepository();
    const useCase = new CreateDefaultPaymentMethodsUseCase(
      paymentMethodRepository,
      preferenceRepository,
    );
    const familyId = FamilyId.generate();
    const creatorId = UserId.generate();

    await useCase.execute({ familyId, creatorId });
    const originalDefault = preferenceRepository.preferences[0]?.defaultPaymentMethodId;
    assert.ok(originalDefault);
    await useCase.execute({ familyId, creatorId });

    assert.equal(paymentMethodRepository.paymentMethods.length, 4);
    assert.equal(preferenceRepository.preferences.length, 1);
    const preference = preferenceRepository.preferences[0];
    assert.ok(preference);
    assert.ok(preference.defaultPaymentMethodId.equals(originalDefault));
  });
});
