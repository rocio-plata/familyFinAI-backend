// contexts/financial-tracking/domain/value-objects/tag-name.js
const MAX_TAG_NAME_LENGTH = 30;

class TagName {
  private constructor(private readonly value: string) {}

  static of(value: string): TagName {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidTagNameError("El nombre del tag no puede estar vacío");
    }

    if (trimmed.length > MAX_TAG_NAME_LENGTH) {
      throw new InvalidTagNameError(`El nombre no puede superar ${MAX_TAG_NAME_LENGTH} caracteres`);
    }

    return new TagName(trimmed);
  }

  toString(): string {
    return this.value;
  }

  equals(other: TagName): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }
}

export { TagName };