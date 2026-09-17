// tests/contexts/financial-tracking/event-handlers/on-family-created-handler.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FamilyCreated } from "../../../../src/contexts/family-access/domain/events/family-created.event.js";
import { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { CreateDefaultPaymentMethodsUseCase } from "../../../../src/contexts/financial-tracking/application/commands/create-default-payment-methods.usecase.js";
import { OnFamilyCreatedHandler } from "../../../../src/contexts/financial-tracking/application/event-handlers/on-family-created.handler.js";
import { InMemoryPaymentMethodRepository } from "../doubles/in-memory-payment-method.repository.js";
import { InMemoryUserPaymentMethodPreferenceRepository } from "../doubles/in-memory-user-payment-method-preference.repository.js";

describe("OnFamilyCreatedHandler", () => {
  test("invoca la creación de medios por defecto con la familia y el creador del evento", async () => {
    const paymentMethodRepository = new InMemoryPaymentMethodRepository();
    const preferenceRepository = new InMemoryUserPaymentMethodPreferenceRepository();
    const createDefaultPaymentMethods = new CreateDefaultPaymentMethodsUseCase(
      paymentMethodRepository,
      preferenceRepository,
    );
    const handler = new OnFamilyCreatedHandler(createDefaultPaymentMethods);
    const familyId = FamilyId.generate();
    const creatorId = UserId.generate();

    await handler.handle(new FamilyCreated(familyId, creatorId));

    assert.equal(paymentMethodRepository.paymentMethods.length, 4);
    assert.equal(preferenceRepository.preferences.length, 1);
    assert.ok(preferenceRepository.preferences[0]?.userId.equals(creatorId));
    assert.ok(preferenceRepository.preferences[0]?.familyId.equals(familyId));
  });
});
