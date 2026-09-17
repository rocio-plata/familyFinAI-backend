// tests/contexts/financial-tracking/doubles/in-memory-payment-method.repository.ts
import type { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import type { PaymentMethod } from "../../../../src/contexts/financial-tracking/domain/entities/payment-method.js";
import type { PaymentMethodRepository } from "../../../../src/contexts/financial-tracking/domain/repositories/payment-method.repository.js";

class InMemoryPaymentMethodRepository implements PaymentMethodRepository {
  readonly paymentMethods: PaymentMethod[] = [];

  async save(paymentMethod: PaymentMethod): Promise<void> {
    this.paymentMethods.push(paymentMethod);
  }

  async findByFamilyId(familyId: FamilyId): Promise<PaymentMethod[]> {
    return this.paymentMethods.filter((paymentMethod) => paymentMethod.familyId.equals(familyId));
  }
}

export { InMemoryPaymentMethodRepository };
