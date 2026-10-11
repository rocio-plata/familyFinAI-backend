// src/contexts/ai-assistance/domain/value-objects/merchant-name.ts
import { InvalidMerchantNameError } from "../errors/invalid-merchant-name.error.js";

class MerchantName {
  private constructor(private readonly value: string) {}

  static create(raw: string): MerchantName {
    const value = raw.trim().replace(/\s+/g, " ");
    if (value.length === 0 || value.length > 100) {
      throw new InvalidMerchantNameError();
    }
    return new MerchantName(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: MerchantName): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }
}

export { MerchantName };
