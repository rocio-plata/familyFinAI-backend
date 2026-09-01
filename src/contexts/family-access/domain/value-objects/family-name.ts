// src/contexts/family-access/domain/value-objects/family-name.ts

import { InvalidFamilyNameError } from "../errors/invalid-family-name.error.js";

class FamilyName {
  private constructor(private readonly value: string) {}
  static of(value: string): FamilyName {
    if (value.trim().length === 0 || value.length > 60) throw new InvalidFamilyNameError(value);
    return new FamilyName(value);
  }

  toString(): string {
    return this.value;
  }
}

export { FamilyName };
