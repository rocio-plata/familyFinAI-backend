// contexts/financial-tracking/domain/value-objects/category-name.ts
import { InvalidCategoryNameError } from "../errors/invalid-category-name.error.js";

const MAX_CATEGORY_NAME_LENGTH = 50;

class CategoryName {
  private constructor(private readonly value: string) {}

  static of(value: string): CategoryName {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidCategoryNameError("El nombre de categoría no puede estar vacío");
    }

    if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) {
      throw new InvalidCategoryNameError(
        `El nombre no puede superar ${MAX_CATEGORY_NAME_LENGTH} caracteres`,
      );
    }

    return new CategoryName(trimmed);
  }

  toString(): string {
    return this.value;
  }

  equals(other: CategoryName): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }
}

export { CategoryName };
