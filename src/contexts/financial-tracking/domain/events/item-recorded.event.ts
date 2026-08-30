// contexts/financial-tracking/domain/events/item-recorded.event.ts

import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import { FinancialItemId } from "../value-objects/financial-item-id.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { CategoryId } from "../value-objects/category-id.js";
import { TagId } from "../value-objects/tag-id.js";
import { Money } from "../value-objects/money.js";
import { FinancialItemType } from "../value-objects/financial-item-type.js";
import { TransactionDate } from "../value-objects/transaction-date.js";

class ItemRecorded extends DomainEvent {
  readonly eventName = "financial-tracking.item-recorded";

  constructor(
    readonly itemId: FinancialItemId,
    readonly familyId: FamilyId,
    readonly categoryId: CategoryId,
    readonly tagId: TagId | null,
    readonly amount: Money,
    readonly type: FinancialItemType,
    readonly occurredOn: TransactionDate,
  ) { super(); }
}
