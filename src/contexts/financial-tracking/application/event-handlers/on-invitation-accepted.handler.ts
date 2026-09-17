// src/contexts/financial-tracking/application/event-handlers/on-invitation-accepted.handler.ts
import type { InvitationAccepted } from "../../../family-access/domain/events/invitation-accepted.event.js";
import type { SetInitialPaymentMethodPreferenceUseCase } from "../commands/set-initial-payment-method-preference.usecase.js";

class OnInvitationAcceptedHandler {
  constructor(
    private readonly setInitialPaymentMethodPreference: SetInitialPaymentMethodPreferenceUseCase,
  ) {}

  async handle(event: InvitationAccepted): Promise<void> {
    await this.setInitialPaymentMethodPreference.execute({
      familyId: event.familyId,
      userId: event.acceptedBy,
    });
  }
}

export { OnInvitationAcceptedHandler };
