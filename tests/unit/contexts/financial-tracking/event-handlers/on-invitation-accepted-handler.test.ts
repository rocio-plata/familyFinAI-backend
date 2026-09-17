// tests/unit/contexts/financial-tracking/event-handlers/on-invitation-accepted-handler.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { InvitationAccepted } from "../../../../../src/contexts/family-access/domain/events/invitation-accepted.event.js";
import { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { InvitationId } from "../../../../../src/contexts/family-access/domain/value-objects/invitation-id.js";
import { Role } from "../../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { SetInitialPaymentMethodPreferenceUseCase } from "../../../../../src/contexts/financial-tracking/application/commands/set-initial-payment-method-preference.usecase.js";
import { OnInvitationAcceptedHandler } from "../../../../../src/contexts/financial-tracking/application/event-handlers/on-invitation-accepted.handler.js";
import { PaymentMethod } from "../../../../../src/contexts/financial-tracking/domain/entities/payment-method.js";
import { PaymentMethodName } from "../../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-name.js";
import { InMemoryPaymentMethodRepository } from "../../../../../src/contexts/financial-tracking/infrastructure/persistence/in-memory-payment-method.repository.js";
import { InMemoryUserPaymentMethodPreferenceRepository } from "../doubles/in-memory-user-payment-method-preference.repository.js";

describe("OnInvitationAcceptedHandler", () => {
  test("crea la preferencia inicial para el miembro aceptado", async () => {
    const paymentMethodRepository = new InMemoryPaymentMethodRepository();
    const preferenceRepository = new InMemoryUserPaymentMethodPreferenceRepository();
    const setInitialPreference = new SetInitialPaymentMethodPreferenceUseCase(
      paymentMethodRepository,
      preferenceRepository,
    );
    const handler = new OnInvitationAcceptedHandler(setInitialPreference);
    const familyId = FamilyId.generate();
    const acceptedBy = UserId.generate();
    await paymentMethodRepository.save(
      PaymentMethod.create(familyId, PaymentMethodName.of("Efectivo")),
    );

    await handler.handle(
      new InvitationAccepted(
        InvitationId.of("11111111-1111-4111-8111-111111111111"),
        familyId,
        acceptedBy,
        Role.member(),
      ),
    );

    const preference = await preferenceRepository.findByUserAndFamily(acceptedBy, familyId);
    assert.ok(preference);
  });
});
