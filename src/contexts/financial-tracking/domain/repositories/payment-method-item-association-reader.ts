// src/contexts/financial-tracking/domain/repositories/payment-method-item-association-reader.ts
import type { PaymentMethodId } from "../value-objects/payment-method-id.js";

interface PaymentMethodItemAssociationReader {
  countByPaymentMethod(paymentMethodId: PaymentMethodId): Promise<number>;
}

export type { PaymentMethodItemAssociationReader };
