// src/contexts/financial-tracking/domain/repositories/user-payment-method-preference.repository.ts

import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import type { UserPaymentMethodPreference } from "../entities/user-payment-method-preference.js";

interface UserPaymentMethodPreferenceRepository {
  save(preference: UserPaymentMethodPreference): Promise<void>;
  findByUserAndFamily(
    userId: UserId,
    familyId: FamilyId,
  ): Promise<UserPaymentMethodPreference | null>;
}

export type { UserPaymentMethodPreferenceRepository };
