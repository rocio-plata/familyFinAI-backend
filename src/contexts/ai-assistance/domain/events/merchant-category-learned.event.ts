// src/contexts/ai-assistance/domain/events/merchant-category-learned.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { MerchantName } from "../value-objects/merchant-name.js";

class MerchantCategoryLearned extends DomainEvent {
  readonly eventName = "ai-assistance.merchant-category-learned";

  constructor(
    readonly familyId: string,
    readonly merchantName: MerchantName,
    readonly categoryId: string,
    readonly tagId: string | null,
  ) {
    super();
  }
}

export { MerchantCategoryLearned };
