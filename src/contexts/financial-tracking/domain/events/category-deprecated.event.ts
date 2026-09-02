// src/contexts/financial-tracking/domain/events/category-deprecated.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { CategoryId } from "../value-objects/category-id.js";

class CategoryDeprecated extends DomainEvent {
  readonly eventName = "financial-tracking.category-deprecated";

  constructor(
    readonly categoryId: CategoryId,
    readonly familyId: string,
  ) {
    super();
  }
}

export { CategoryDeprecated };
