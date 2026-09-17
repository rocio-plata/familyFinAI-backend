// tests/unit/contexts/financial-tracking/doubles/fake-payment-method-item-association-reader.ts

import type { PaymentMethodItemAssociationReader } from "../../../../../src/contexts/financial-tracking/domain/repositories/payment-method-item-association-reader.js";
import type { PaymentMethodId } from "../../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-id.js";

class FakePaymentMethodItemAssociationReader implements PaymentMethodItemAssociationReader {
  private readonly itemCounts = new Map<string, number>();

  setItemCount(paymentMethodId: PaymentMethodId, count: number): void {
    this.itemCounts.set(paymentMethodId.toString(), count);
  }

  async countByPaymentMethod(paymentMethodId: PaymentMethodId): Promise<number> {
    return this.itemCounts.get(paymentMethodId.toString()) ?? 0;
  }
}

export { FakePaymentMethodItemAssociationReader };
