// contexts/financial-tracking/domain/value-objects/category-assignment.ts
import type { CategoryId } from "./category-id.js";
import type { TagId } from "./tag-id.js";

class CategoryAssignment {
  private constructor(
    private readonly _categoryId: CategoryId,
    private readonly _tagId: TagId | null, // el tag es opcional, como definiste
  ) {}

  static of(categoryId: CategoryId, tagId: TagId | null = null): CategoryAssignment {
    // invariante pendiente: validar que tagId (si viene) pertenezca a categoryId
    return new CategoryAssignment(categoryId, tagId);
  }

  get categoryId(): CategoryId {
    return this._categoryId;
  }

  get tagId(): TagId | null {
    return this._tagId;
  }

  equals(other: CategoryAssignment): boolean {
    const tagsEqual =
      this._tagId === null && other._tagId === null
        ? true
        : this._tagId !== null && other._tagId !== null
          ? this._tagId.equals(other._tagId)
          : false;
    return this._categoryId.equals(other._categoryId) && tagsEqual;
  }
}

export { CategoryAssignment };
