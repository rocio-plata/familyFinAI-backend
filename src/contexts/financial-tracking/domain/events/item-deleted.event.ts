// /src/contexts/financial-tracking/domain/events/item-deleted.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { CategoryId } from "../value-objects/category-id.js";
import type { FinancialItemId } from "../value-objects/financial-item-id.js";
import type { FinancialItemType } from "../value-objects/financial-item-type.js";
import type { TagId } from "../value-objects/tag-id.js";

class ItemDeleted extends DomainEvent {
  readonly eventName = "financial-tracking.item-deleted";

  constructor(
    readonly itemId: FinancialItemId,
    readonly familyId: string,
    readonly categoryId: CategoryId,
    readonly tagId: TagId | null,
    readonly amount: number,
    readonly type: FinancialItemType,
    readonly occurredOn: Date,
    readonly currency: string,
  ) {
    super();
  }
}

export { ItemDeleted };
