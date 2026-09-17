// src/contexts/financial-tracking/domain/services/payment-method-deletion.service.ts
import type { PaymentMethod } from "../entities/payment-method.js";
import { PaymentMethodHasAssociatedItemsError } from "../errors/payment-method-has-associated-items.error.js";
import type { PaymentMethodItemAssociationReader } from "../repositories/payment-method-item-association-reader.js";

class PaymentMethodDeletionService {
  constructor(
    private readonly paymentMethodItemAssociationReader: PaymentMethodItemAssociationReader,
  ) {}

  async delete(paymentMethod: PaymentMethod): Promise<void> {
    const itemCount = await this.paymentMethodItemAssociationReader.countByPaymentMethod(
      paymentMethod.id,
    );

    if (itemCount > 0) {
      throw new PaymentMethodHasAssociatedItemsError(paymentMethod.id.toString());
    }
  }
}

export { PaymentMethodDeletionService };
