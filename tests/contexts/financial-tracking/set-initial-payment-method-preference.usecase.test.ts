// tests/contexts/financial-tracking/set-initial-payment-method-preference.usecase.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { SetInitialPaymentMethodPreferenceUseCase } from "../../../src/contexts/financial-tracking/application/commands/set-initial-payment-method-preference.usecase.js";
import { PaymentMethod } from "../../../src/contexts/financial-tracking/domain/entities/payment-method.js";
import { UserPaymentMethodPreference } from "../../../src/contexts/financial-tracking/domain/entities/user-payment-method-preference.js";
import { PaymentMethodNotActiveError } from "../../../src/contexts/financial-tracking/domain/errors/payment-method-not-active.error.js";
import { PaymentMethodNotFoundError } from "../../../src/contexts/financial-tracking/domain/errors/payment-method-not-found.error.js";
import { PaymentMethodName } from "../../../src/contexts/financial-tracking/domain/value-objects/payment-method-name.js";
import { InMemoryPaymentMethodRepository } from "../../../src/contexts/financial-tracking/infrastructure/persistence/in-memory-payment-method.repository.js";
import { InMemoryUserPaymentMethodPreferenceRepository } from "./doubles/in-memory-user-payment-method-preference.repository.js";

describe("SetInitialPaymentMethodPreferenceUseCase", () => {
  test("crea la preferencia del usuario apuntando a Efectivo de su familia", async () => {
    const paymentMethodRepository = new InMemoryPaymentMethodRepository();
    const preferenceRepository = new InMemoryUserPaymentMethodPreferenceRepository();
    const useCase = new SetInitialPaymentMethodPreferenceUseCase(
      paymentMethodRepository,
      preferenceRepository,
    );
    const familyId = FamilyId.generate();
    const userId = UserId.generate();
    const cash = PaymentMethod.create(familyId, PaymentMethodName.of("Efectivo"));
    await paymentMethodRepository.save(cash);

    await useCase.execute({ familyId, userId });

    const preference = await preferenceRepository.findByUserAndFamily(userId, familyId);
    assert.ok(preference);
    assert.ok(preference.defaultPaymentMethodId.equals(cash.id));
  });

  test("no reemplaza una preferencia existente", async () => {
    const paymentMethodRepository = new InMemoryPaymentMethodRepository();
    const preferenceRepository = new InMemoryUserPaymentMethodPreferenceRepository();
    const useCase = new SetInitialPaymentMethodPreferenceUseCase(
      paymentMethodRepository,
      preferenceRepository,
    );
    const familyId = FamilyId.generate();
    const userId = UserId.generate();
    const cash = PaymentMethod.create(familyId, PaymentMethodName.of("Efectivo"));
    const card = PaymentMethod.create(familyId, PaymentMethodName.of("Tarjeta"));
    await paymentMethodRepository.save(cash);
    await paymentMethodRepository.save(card);
    await preferenceRepository.save(UserPaymentMethodPreference.create(userId, familyId, card.id));

    await useCase.execute({ familyId, userId });

    const preference = await preferenceRepository.findByUserAndFamily(userId, familyId);
    assert.ok(preference);
    assert.ok(preference.defaultPaymentMethodId.equals(card.id));
  });

  test("usa solo el Efectivo de la familia solicitada", async () => {
    const paymentMethodRepository = new InMemoryPaymentMethodRepository();
    const preferenceRepository = new InMemoryUserPaymentMethodPreferenceRepository();
    const useCase = new SetInitialPaymentMethodPreferenceUseCase(
      paymentMethodRepository,
      preferenceRepository,
    );
    const familyId = FamilyId.generate();
    await paymentMethodRepository.save(
      PaymentMethod.create(FamilyId.generate(), PaymentMethodName.of("Efectivo")),
    );

    await assert.rejects(
      () => useCase.execute({ familyId, userId: UserId.generate() }),
      PaymentMethodNotFoundError,
    );
  });

  test("falla si la familia no tiene Efectivo", async () => {
    const useCase = new SetInitialPaymentMethodPreferenceUseCase(
      new InMemoryPaymentMethodRepository(),
      new InMemoryUserPaymentMethodPreferenceRepository(),
    );

    await assert.rejects(
      () => useCase.execute({ familyId: FamilyId.generate(), userId: UserId.generate() }),
      PaymentMethodNotFoundError,
    );
  });

  test("falla si Efectivo está deprecado", async () => {
    const paymentMethodRepository = new InMemoryPaymentMethodRepository();
    const useCase = new SetInitialPaymentMethodPreferenceUseCase(
      paymentMethodRepository,
      new InMemoryUserPaymentMethodPreferenceRepository(),
    );
    const familyId = FamilyId.generate();
    const cash = PaymentMethod.create(familyId, PaymentMethodName.of("Efectivo"));
    cash.deprecate();
    await paymentMethodRepository.save(cash);

    await assert.rejects(
      () => useCase.execute({ familyId, userId: UserId.generate() }),
      new PaymentMethodNotActiveError(cash.id.toString()),
    );
  });
});
