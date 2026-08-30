// src/contexts/family-access/domain/value-objects/family-name.ts

class FamilyName {
  private constructor(private readonly value: string) {}
  static of(value: string): FamilyName {
    if (value.trim().length === 0 || value.length > 60) throw new InvalidFamilyNameError();
    return new FamilyName(value);
  }
}


export { FamilyName };