// tests/contexts/financial-tracking/doubles/in-memory-user-payment-method-preference.repository.ts
import type { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import type { UserPaymentMethodPreference } from "../../../../src/contexts/financial-tracking/domain/entities/user-payment-method-preference.js";
import type { UserPaymentMethodPreferenceRepository } from "../../../../src/contexts/financial-tracking/domain/repositories/user-payment-method-preference.repository.js";
import type { PaymentMethodId } from "../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-id.js";

class InMemoryUserPaymentMethodPreferenceRepository
  implements UserPaymentMethodPreferenceRepository
{
  private readonly preferencesByKey = new Map<string, UserPaymentMethodPreference>();

  get preferences(): UserPaymentMethodPreference[] {
    return [...this.preferencesByKey.values()];
  }

  async save(preference: UserPaymentMethodPreference): Promise<void> {
    this.preferencesByKey.set(this.keyOf(preference.userId, preference.familyId), preference);
  }

  async findByUserAndFamily(
    userId: UserId,
    familyId: FamilyId,
  ): Promise<UserPaymentMethodPreference | null> {
    return this.preferencesByKey.get(this.keyOf(userId, familyId)) ?? null;
  }

  async existsAnyForPaymentMethod(paymentMethodId: PaymentMethodId): Promise<boolean> {
    return this.preferences.some((preference) =>
      preference.defaultPaymentMethodId.equals(paymentMethodId),
    );
  }

  async delete(userId: UserId, familyId: FamilyId): Promise<void> {
    this.preferencesByKey.delete(this.keyOf(userId, familyId));
  }

  private keyOf(userId: UserId, familyId: FamilyId): string {
    return `${userId.toString()}:${familyId.toString()}`;
  }
}

export { InMemoryUserPaymentMethodPreferenceRepository };
