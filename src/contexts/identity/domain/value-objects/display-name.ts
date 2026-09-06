// /src/contexts/identity/domain/value-objects/display-name.ts
import { InvalidDisplayNameError } from "../errors/invalid-display-name.error.js";

const MAX_DISPLAY_NAME_LENGTH = 60;

class DisplayName {
  private constructor(private readonly value: string) {}

  static of(value: string): DisplayName {
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
      throw new InvalidDisplayNameError();
    }
    return new DisplayName(trimmed);
  }

  toString(): string {
    return this.value;
  }

  equals(other: DisplayName): boolean {
    return this.value === other.value;
  }
}

export { DisplayName };
