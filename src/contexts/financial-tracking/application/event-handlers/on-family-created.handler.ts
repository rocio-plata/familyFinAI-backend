// src/contexts/financial-tracking/application/event-handlers/on-family-created.handler.ts
import type { FamilyCreated } from "../../../family-access/domain/events/family-created.event.js";
import type { CreateDefaultPaymentMethodsUseCase } from "../commands/create-default-payment-methods.usecase.js";

class OnFamilyCreatedHandler {
  constructor(private readonly createDefaultPaymentMethods: CreateDefaultPaymentMethodsUseCase) {}

  async handle(event: FamilyCreated): Promise<void> {
    await this.createDefaultPaymentMethods.execute({
      familyId: event.familyId,
      creatorId: event.creatorId,
    });
  }
}

export { OnFamilyCreatedHandler };
