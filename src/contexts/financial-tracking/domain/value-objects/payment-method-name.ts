// src/contexts/financial-tracking/domain/value-objects/payment-method-name.ts
import { InvalidPaymentMethodNameError } from "../errors/invalid-payment-method-name.error.js";

const MAX_PAYMENT_METHOD_NAME_LENGTH = 40;

class PaymentMethodName {
  private constructor(private readonly value: string) {}

  static of(value: string): PaymentMethodName {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidPaymentMethodNameError("El nombre del medio de pago no puede estar vacío");
    }

    if (trimmed.length > MAX_PAYMENT_METHOD_NAME_LENGTH) {
      throw new InvalidPaymentMethodNameError(
        `El nombre no puede superar ${MAX_PAYMENT_METHOD_NAME_LENGTH} caracteres`,
      );
    }

    return new PaymentMethodName(trimmed);
  }

  toString(): string {
    return this.value;
  }

  equals(other: PaymentMethodName): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }
}

export { PaymentMethodName };
