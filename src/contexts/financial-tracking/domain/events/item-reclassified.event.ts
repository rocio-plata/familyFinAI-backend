// /src/contexts/financial-tracking/domain/events/item-reclassified.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { CategoryId } from "../value-objects/category-id.js";
import type { FinancialItemId } from "../value-objects/financial-item-id.js";
import type { FinancialItemType } from "../value-objects/financial-item-type.js";
import type { TagId } from "../value-objects/tag-id.js";

class ItemReclassified extends DomainEvent {
  readonly eventName = "financial-tracking.item-reclassified";

  constructor(
    readonly itemId: FinancialItemId,
    readonly familyId: string,
    readonly previousCategoryId: CategoryId,
    readonly newCategoryId: CategoryId,
    readonly previousTagId: TagId | null,
    readonly newTagId: TagId | null,
    readonly type: FinancialItemType,
    readonly occurredOn: Date,
    readonly amount: number,
    readonly currency: string,
  ) {
    super();
  }
}

export { ItemReclassified };
