// tests/contexts/financial-tracking/create-default-payment-methods.usecase.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { CreateDefaultPaymentMethodsUseCase } from "../../../src/contexts/financial-tracking/application/commands/create-default-payment-methods.usecase.js";
import type { PaymentMethod } from "../../../src/contexts/financial-tracking/domain/entities/payment-method.js";
import type { UserPaymentMethodPreference } from "../../../src/contexts/financial-tracking/domain/entities/user-payment-method-preference.js";
import type { PaymentMethodRepository } from "../../../src/contexts/financial-tracking/domain/repositories/payment-method.repository.js";
import type { UserPaymentMethodPreferenceRepository } from "../../../src/contexts/financial-tracking/domain/repositories/user-payment-method-preference.repository.js";

class InMemoryPaymentMethodRepository implements PaymentMethodRepository {
  readonly paymentMethods: PaymentMethod[] = [];

  async save(paymentMethod: PaymentMethod): Promise<void> {
    this.paymentMethods.push(paymentMethod);
  }

  async findByFamilyId(familyId: FamilyId): Promise<PaymentMethod[]> {
    return this.paymentMethods.filter((paymentMethod) => paymentMethod.familyId.equals(familyId));
  }
}

class InMemoryUserPaymentMethodPreferenceRepository
  implements UserPaymentMethodPreferenceRepository
{
  readonly preferences: UserPaymentMethodPreference[] = [];

  async save(preference: UserPaymentMethodPreference): Promise<void> {
    this.preferences.push(preference);
  }

  async findByUserAndFamily(
    userId: UserId,
    familyId: FamilyId,
  ): Promise<UserPaymentMethodPreference | null> {
    return (
      this.preferences.find(
        (preference) => preference.userId.equals(userId) && preference.familyId.equals(familyId),
      ) ?? null
    );
  }
}

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
