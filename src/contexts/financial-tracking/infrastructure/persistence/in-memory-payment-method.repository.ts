// src/contexts/financial-tracking/infrastructure/persistence/in-memory-payment-method.repository.ts
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { PaymentMethod } from "../../domain/entities/payment-method.js";
import type { PaymentMethodRepository } from "../../domain/repositories/payment-method.repository.js";
import type { PaymentMethodId } from "../../domain/value-objects/payment-method-id.js";

class InMemoryPaymentMethodRepository implements PaymentMethodRepository {
  private readonly paymentMethods = new Map<string, PaymentMethod>();

  async save(paymentMethod: PaymentMethod): Promise<void> {
    this.paymentMethods.set(paymentMethod.id.toString(), paymentMethod);
  }

  async findById(paymentMethodId: PaymentMethodId): Promise<PaymentMethod | null> {
    return this.paymentMethods.get(paymentMethodId.toString()) ?? null;
  }

  async findByFamilyId(familyId: FamilyId): Promise<PaymentMethod[]> {
    return [...this.paymentMethods.values()].filter((paymentMethod) =>
      paymentMethod.familyId.equals(familyId),
    );
  }

  async delete(paymentMethodId: PaymentMethodId): Promise<void> {
    this.paymentMethods.delete(paymentMethodId.toString());
  }
}

export { InMemoryPaymentMethodRepository };
