// src/contexts/financial-tracking/domain/value-objects/category-icon.ts
import { InvalidCategoryIconError } from "../errors/invalid-category-icon.error.js";

const MAX_CATEGORY_ICON_LENGTH = 40;

class CategoryIcon {
  private constructor(private readonly value: string) {}

  static of(value: string): CategoryIcon {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidCategoryIconError("La clave de ícono no puede estar vacía");
    }

    if (trimmed.length > MAX_CATEGORY_ICON_LENGTH) {
      throw new InvalidCategoryIconError(
        `La clave de ícono no puede superar ${MAX_CATEGORY_ICON_LENGTH} caracteres`,
      );
    }

    return new CategoryIcon(trimmed);
  }

  toString(): string {
    return this.value;
  }

  equals(other: CategoryIcon): boolean {
    return this.value === other.value;
  }
}

export { CategoryIcon };
