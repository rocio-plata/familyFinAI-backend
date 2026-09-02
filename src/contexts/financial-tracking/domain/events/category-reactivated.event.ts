// src/contexts/financial-tracking/domain/events/category-reactivated.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { CategoryId } from "../value-objects/category-id.js";

class CategoryReactivated extends DomainEvent {
  readonly eventName = "financial-tracking.category-reactivated";

  constructor(
    readonly categoryId: CategoryId,
    readonly familyId: string,
  ) {
    super();
  }
}

export { CategoryReactivated };
