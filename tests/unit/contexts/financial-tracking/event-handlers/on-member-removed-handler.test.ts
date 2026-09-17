// tests/unit/contexts/financial-tracking/event-handlers/on-member-removed-handler.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MemberRemoved } from "../../../../../src/contexts/family-access/domain/events/member-removed.event.js";
import { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { OnMemberRemovedHandler } from "../../../../../src/contexts/financial-tracking/application/event-handlers/on-member-removed.handler.js";
import { UserPaymentMethodPreference } from "../../../../../src/contexts/financial-tracking/domain/entities/user-payment-method-preference.js";
import { PaymentMethodId } from "../../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-id.js";
import { InMemoryUserPaymentMethodPreferenceRepository } from "../doubles/in-memory-user-payment-method-preference.repository.js";

describe("OnMemberRemovedHandler", () => {
  test("elimina la preferencia del miembro removido en esa familia", async () => {
    const preferenceRepository = new InMemoryUserPaymentMethodPreferenceRepository();
    const handler = new OnMemberRemovedHandler(preferenceRepository);
    const familyId = FamilyId.generate();
    const removedUserId = UserId.generate();
    await preferenceRepository.save(
      UserPaymentMethodPreference.create(removedUserId, familyId, PaymentMethodId.generate()),
    );

    await handler.handle(new MemberRemoved(familyId, removedUserId, UserId.generate()));

    assert.equal(await preferenceRepository.findByUserAndFamily(removedUserId, familyId), null);
  });

  test("no falla si el miembro no tenía preferencia", async () => {
    const preferenceRepository = new InMemoryUserPaymentMethodPreferenceRepository();
    const handler = new OnMemberRemovedHandler(preferenceRepository);

    await assert.doesNotReject(() =>
      handler.handle(new MemberRemoved(FamilyId.generate(), UserId.generate(), UserId.generate())),
    );
  });
});
