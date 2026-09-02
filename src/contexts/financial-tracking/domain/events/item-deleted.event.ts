// src/contexts/financial-tracking/domain/events/item-deleted.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { CategoryId } from "../value-objects/category-id.js";
import type { FinancialItemId } from "../value-objects/financial-item-id.js";
import type { TagId } from "../value-objects/tag-id.js";

class ItemDeleted extends DomainEvent {
  readonly eventName = "financial-tracking.item-deleted";

  constructor(
    readonly itemId: FinancialItemId,
    readonly familyId: string,
    readonly categoryId: CategoryId,
    readonly tagId: TagId | null,
    readonly amount: number,
    readonly type: string,
  ) {
    super();
  }
}

export { ItemDeleted };
