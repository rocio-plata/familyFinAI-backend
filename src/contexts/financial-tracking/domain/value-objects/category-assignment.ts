// contexts/financial-tracking/domain/value-objects/category-assignment.ts
import type { CategoryId } from "./category-id.js";
import type { TagId } from "./tag-id.js";


class CategoryAssignment {
  private constructor(
    private readonly categoryId: CategoryId,
    private readonly tagId: TagId | null,     // el tag es opcional, como definiste
  ) {}
}

export { CategoryAssignment };