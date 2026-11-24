// /src/contexts/financial-tracking/domain/events/tag-reactivated.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { CategoryId } from "../value-objects/category-id.js";
import type { TagId } from "../value-objects/tag-id.js";

class TagReactivated extends DomainEvent {
  readonly eventName = "financial-tracking.tag-reactivated";

  constructor(
    readonly tagId: TagId,
    readonly categoryId: CategoryId,
    readonly familyId: string,
  ) {
    super();
  }
}

export { TagReactivated };
