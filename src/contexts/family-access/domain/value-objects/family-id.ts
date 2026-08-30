// src/contexts/family-access/domain/value-objects/family-id.ts
import { randomUUID } from "node:crypto";
import { isValidUUID } from "../../../../shared-kernel/domain/uuid.js";
import { InvalidFamilyIdError } from "../errors/invalid-family-id.error.js";

class FamilyId {
  private constructor(private readonly value: string) {}

  static generate(): FamilyId {
    return new FamilyId(randomUUID());
  }

  static of(value: string): FamilyId {
    if (!isValidUUID(value)) throw new InvalidFamilyIdError(value);
    return new FamilyId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: FamilyId): boolean {
    return this.value === other.value;
  }
}

export { FamilyId };