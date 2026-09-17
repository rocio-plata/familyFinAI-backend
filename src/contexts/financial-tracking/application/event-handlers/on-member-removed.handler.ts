// src/contexts/financial-tracking/application/event-handlers/on-member-removed.handler.ts
import type { MemberRemoved } from "../../../family-access/domain/events/member-removed.event.js";
import type { UserPaymentMethodPreferenceRepository } from "../../domain/repositories/user-payment-method-preference.repository.js";

class OnMemberRemovedHandler {
  constructor(private readonly preferenceRepository: UserPaymentMethodPreferenceRepository) {}

  async handle(event: MemberRemoved): Promise<void> {
    await this.preferenceRepository.delete(event.removedUserId, event.familyId);
  }
}

export { OnMemberRemovedHandler };
