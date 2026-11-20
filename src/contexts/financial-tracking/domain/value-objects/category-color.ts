// src/contexts/financial-tracking/domain/value-objects/category-color.ts
import { InvalidCategoryColorError } from "../errors/invalid-category-color.error.js";

const MAX_CATEGORY_COLOR_LENGTH = 40;

class CategoryColor {
  private constructor(private readonly value: string) {}

  static of(value: string): CategoryColor {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidCategoryColorError("La clave de color no puede estar vacía");
    }

    if (trimmed.length > MAX_CATEGORY_COLOR_LENGTH) {
      throw new InvalidCategoryColorError(
        `La clave de color no puede superar ${MAX_CATEGORY_COLOR_LENGTH} caracteres`,
      );
    }

    return new CategoryColor(trimmed);
  }

  toString(): string {
    return this.value;
  }

  equals(other: CategoryColor): boolean {
    return this.value === other.value;
  }
}

export { CategoryColor };
