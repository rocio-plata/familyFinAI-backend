// src/contexts/financial-tracking/domain/value-objects/payment-method-id.ts
import { randomUUID } from "node:crypto";
import { isValidUUID } from "../../../../shared-kernel/domain/uuid.js";
import { InvalidPaymentMethodIdError } from "../errors/invalid-id.error.js";

class PaymentMethodId {
  private constructor(private readonly value: string) {}

  static generate(): PaymentMethodId {
    return new PaymentMethodId(randomUUID());
  }

  static of(value: string): PaymentMethodId {
    if (!isValidUUID(value)) throw new InvalidPaymentMethodIdError(value);
    return new PaymentMethodId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: PaymentMethodId): boolean {
    return this.value === other.value;
  }
}

export { PaymentMethodId };
