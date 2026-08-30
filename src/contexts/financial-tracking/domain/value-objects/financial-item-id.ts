// contexts/financial-tracking/domain/value-objects/financial-item-id.ts
import { randomUUID } from "node:crypto";
import { isValidUUID } from "../../../../shared-kernel/domain/uuid.js";

class FinancialItemId {
  private constructor(private readonly value: string) {}

  static generate(): FinancialItemId {
    return new FinancialItemId(randomUUID());
  }

  static of(value: string): FinancialItemId {
    if (!isValidUUID(value)) throw new InvalidFinancialItemIdError(value);
    return new FinancialItemId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: FinancialItemId): boolean {
    return this.value === other.value;
  }
}

export { FinancialItemId };