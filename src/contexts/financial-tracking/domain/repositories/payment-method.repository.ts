// src/contexts/financial-tracking/domain/repositories/payment-method.repository.ts

import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { PaymentMethod } from "../entities/payment-method.js";

interface PaymentMethodRepository {
  save(paymentMethod: PaymentMethod): Promise<void>;
  findByFamilyId(familyId: FamilyId): Promise<PaymentMethod[]>;
}

export type { PaymentMethodRepository };
