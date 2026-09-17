// tests/contexts/financial-tracking/doubles/in-memory-user-payment-method-preference.repository.ts
import type { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import type { UserPaymentMethodPreference } from "../../../../src/contexts/financial-tracking/domain/entities/user-payment-method-preference.js";
import type { UserPaymentMethodPreferenceRepository } from "../../../../src/contexts/financial-tracking/domain/repositories/user-payment-method-preference.repository.js";

class InMemoryUserPaymentMethodPreferenceRepository
  implements UserPaymentMethodPreferenceRepository
{
  readonly preferences: UserPaymentMethodPreference[] = [];

  async save(preference: UserPaymentMethodPreference): Promise<void> {
    this.preferences.push(preference);
  }

  async findByUserAndFamily(
    userId: UserId,
    familyId: FamilyId,
  ): Promise<UserPaymentMethodPreference | null> {
    return (
      this.preferences.find(
        (preference) =>
          preference.userId.equals(userId) && preference.familyId.equals(familyId),
      ) ?? null
    );
  }
}

export { InMemoryUserPaymentMethodPreferenceRepository };
