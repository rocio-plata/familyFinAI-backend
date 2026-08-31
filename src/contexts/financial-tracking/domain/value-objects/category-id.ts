// contexts/financial-tracking/domain/value-objects/category-id.ts
import { randomUUID } from "node:crypto";
import { isValidUUID } from "../../../../shared-kernel/domain/uuid.js";
import { InvalidCategoryIdError } from "../errors/invalid-id.error.js";

class CategoryId {
  private constructor(private readonly value: string) {}

  static generate(): CategoryId {
    return new CategoryId(randomUUID());
  }

  static of(value: string): CategoryId {
    if (!isValidUUID(value)) throw new InvalidCategoryIdError(value);
    return new CategoryId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: CategoryId): boolean {
    return this.value === other.value;
  }
}

export { CategoryId };
