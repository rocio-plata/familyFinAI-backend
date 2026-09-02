// src/contexts/financial-tracking/domain/events/category-created.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { CategoryId } from "../value-objects/category-id.js";

class CategoryCreated extends DomainEvent {
  readonly eventName = "financial-tracking.category-created";

  constructor(
    readonly categoryId: CategoryId,
    readonly familyId: string,
    readonly name: string,
  ) {
    super();
  }
}

export { CategoryCreated };
