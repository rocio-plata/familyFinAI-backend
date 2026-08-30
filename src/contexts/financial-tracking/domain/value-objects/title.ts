// contexts/financial-tracking/domain/value-objects/title.ts
import { InvalidTitleError } from "../errors/invalid-title.error.js";
const MAX_TITLE_LENGTH = 100;

class Title {
  private constructor(private readonly value: string) {}

  static of(value: string): Title {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidTitleError("El título no puede estar vacío");
    }

    if (trimmed.length > MAX_TITLE_LENGTH) {
      throw new InvalidTitleError(`El título no puede superar ${MAX_TITLE_LENGTH} caracteres`);
    }

    return new Title(trimmed);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Title): boolean {
    return this.value === other.value;
  }
}

export { Title };