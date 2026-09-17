// src/contexts/financial-tracking/infrastructure/persistence/in-memory-user-payment-method-preference.repository.ts
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import type { UserPaymentMethodPreference } from "../../domain/entities/user-payment-method-preference.js";
import type { UserPaymentMethodPreferenceRepository } from "../../domain/repositories/user-payment-method-preference.repository.js";
import type { PaymentMethodId } from "../../domain/value-objects/payment-method-id.js";

class InMemoryUserPaymentMethodPreferenceRepository
  implements UserPaymentMethodPreferenceRepository
{
  private readonly preferences = new Map<string, UserPaymentMethodPreference>();

  async save(preference: UserPaymentMethodPreference): Promise<void> {
    this.preferences.set(this.keyOf(preference.userId, preference.familyId), preference);
  }

  async findByUserAndFamily(
    userId: UserId,
    familyId: FamilyId,
  ): Promise<UserPaymentMethodPreference | null> {
    return this.preferences.get(this.keyOf(userId, familyId)) ?? null;
  }

  async existsAnyForPaymentMethod(paymentMethodId: PaymentMethodId): Promise<boolean> {
    return [...this.preferences.values()].some((preference) =>
      preference.defaultPaymentMethodId.equals(paymentMethodId),
    );
  }

  async delete(userId: UserId, familyId: FamilyId): Promise<void> {
    this.preferences.delete(this.keyOf(userId, familyId));
  }

  private keyOf(userId: UserId, familyId: FamilyId): string {
    return `${userId.toString()}:${familyId.toString()}`;
  }
}

export { InMemoryUserPaymentMethodPreferenceRepository };
