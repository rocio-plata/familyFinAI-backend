// tests/unit/contexts/financial-tracking/financial-tracking.module.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { GetFamilyDefaultCurrencyQuery } from "../../../../src/contexts/family-access/application/queries/get-family-default-currency.query.js";
import type { GetFamilyMembershipQuery } from "../../../../src/contexts/family-access/application/queries/get-family-membership.query.js";
import { FamilyCreated } from "../../../../src/contexts/family-access/domain/events/family-created.event.js";
import { InvitationAccepted } from "../../../../src/contexts/family-access/domain/events/invitation-accepted.event.js";
import { MemberRemoved } from "../../../../src/contexts/family-access/domain/events/member-removed.event.js";
import { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { InvitationId } from "../../../../src/contexts/family-access/domain/value-objects/invitation-id.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { buildFinancialTrackingModule } from "../../../../src/contexts/financial-tracking/financial-tracking.module.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";
import { InMemoryCategoryRepository } from "./doubles/in-memory-category.repository.js";
import { InMemoryFinancialItemRepository } from "./doubles/in-memory-financial-item.repository.js";
import { InMemoryPaymentMethodRepository } from "./doubles/in-memory-payment-method.repository.js";
import { InMemoryUserPaymentMethodPreferenceRepository } from "./doubles/in-memory-user-payment-method-preference.repository.js";

function buildModule() {
  const eventBus = new FakeEventBus();
  const paymentMethodRepository = new InMemoryPaymentMethodRepository();
  const preferenceRepository = new InMemoryUserPaymentMethodPreferenceRepository();

  buildFinancialTrackingModule(
    {
      categoryRepository: new InMemoryCategoryRepository(),
      financialItemRepository: new InMemoryFinancialItemRepository(),
      paymentMethodRepository,
      preferenceRepository,
      eventBus,
    },
    {} as GetFamilyMembershipQuery,
    {} as GetFamilyDefaultCurrencyQuery,
  );

  return { eventBus, paymentMethodRepository, preferenceRepository };
}

describe("buildFinancialTrackingModule — suscripciones de medios de pago al EventBus", () => {
  test("FamilyCreated crea los medios de pago por defecto de la familia", async () => {
    const { eventBus, paymentMethodRepository } = buildModule();
    const familyId = FamilyId.generate();

    await eventBus.publish(new FamilyCreated(familyId, UserId.generate()));

    const methods = await paymentMethodRepository.findByFamilyId(familyId);
    assert.ok(methods.some((method) => method.name.toString() === "Efectivo"));
  });

  test("InvitationAccepted fija Efectivo como preferencia inicial del usuario aceptante", async () => {
    const { eventBus, preferenceRepository } = buildModule();
    const familyId = FamilyId.generate();
    const acceptedBy = UserId.generate();

    await eventBus.publish(new FamilyCreated(familyId, UserId.generate()));
    await eventBus.publish(
      new InvitationAccepted(InvitationId.generate(), familyId, acceptedBy, Role.member()),
    );

    const preference = await preferenceRepository.findByUserAndFamily(acceptedBy, familyId);
    assert.ok(preference);
  });

  test("MemberRemoved elimina la preferencia de medio de pago del miembro removido", async () => {
    const { eventBus, preferenceRepository } = buildModule();
    const familyId = FamilyId.generate();
    const removedUserId = UserId.generate();

    await eventBus.publish(new FamilyCreated(familyId, UserId.generate()));
    await eventBus.publish(
      new InvitationAccepted(InvitationId.generate(), familyId, removedUserId, Role.member()),
    );
    await eventBus.publish(new MemberRemoved(familyId, removedUserId, UserId.generate()));

    const preference = await preferenceRepository.findByUserAndFamily(removedUserId, familyId);
    assert.equal(preference, null);
  });
});
