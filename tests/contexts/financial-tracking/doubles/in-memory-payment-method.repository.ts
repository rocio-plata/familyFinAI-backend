// tests/contexts/financial-tracking/doubles/in-memory-payment-method.repository.ts
import type { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import type { PaymentMethod } from "../../../../src/contexts/financial-tracking/domain/entities/payment-method.js";
import type { PaymentMethodRepository } from "../../../../src/contexts/financial-tracking/domain/repositories/payment-method.repository.js";
import type { PaymentMethodId } from "../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-id.js";

class InMemoryPaymentMethodRepository implements PaymentMethodRepository {
  private readonly paymentMethodsById = new Map<string, PaymentMethod>();

  get paymentMethods(): PaymentMethod[] {
    return [...this.paymentMethodsById.values()];
  }

  async save(paymentMethod: PaymentMethod): Promise<void> {
    this.paymentMethodsById.set(paymentMethod.id.toString(), paymentMethod);
  }

  async findById(paymentMethodId: PaymentMethodId): Promise<PaymentMethod | null> {
    return this.paymentMethodsById.get(paymentMethodId.toString()) ?? null;
  }

  async findByFamilyId(familyId: FamilyId): Promise<PaymentMethod[]> {
    return this.paymentMethods.filter((paymentMethod) => paymentMethod.familyId.equals(familyId));
  }

  async delete(paymentMethodId: PaymentMethodId): Promise<void> {
    this.paymentMethodsById.delete(paymentMethodId.toString());
  }
}

export { InMemoryPaymentMethodRepository };
