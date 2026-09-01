// src/contexts/financial-tracking/domain/events/item-amount-changed.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { FinancialItemId } from "../value-objects/financial-item-id.js";

class ItemAmountChanged extends DomainEvent {
  readonly eventName = "financial-tracking.item-amount-changed";

  constructor(
    readonly itemId: FinancialItemId,
    readonly familyId: string,
    readonly previousAmount: number,
    readonly newAmount: number,
    readonly currency: string,
  ) {
    super();
  }
}

export { ItemAmountChanged };
