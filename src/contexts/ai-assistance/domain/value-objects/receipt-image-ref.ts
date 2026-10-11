// src/contexts/ai-assistance/domain/value-objects/receipt-image-ref.ts
import { InvalidReceiptImageRefError } from "../errors/invalid-receipt-image-ref.error.js";

class ReceiptImageRef {
  private constructor(private readonly value: string) {}

  static create(raw: string): ReceiptImageRef {
    const value = raw.trim();
    if (value.length === 0) throw new InvalidReceiptImageRefError();
    return new ReceiptImageRef(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: ReceiptImageRef): boolean {
    return this.value === other.value;
  }
}

export { ReceiptImageRef };
