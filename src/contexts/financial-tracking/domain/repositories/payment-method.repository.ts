// src/contexts/financial-tracking/domain/repositories/payment-method.repository.ts

import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { PaymentMethod } from "../entities/payment-method.js";
import type { PaymentMethodId } from "../value-objects/payment-method-id.js";

interface PaymentMethodRepository {
  save(paymentMethod: PaymentMethod): Promise<void>;
  findById(paymentMethodId: PaymentMethodId): Promise<PaymentMethod | null>;
  findByFamilyId(familyId: FamilyId): Promise<PaymentMethod[]>;
  delete(paymentMethodId: PaymentMethodId): Promise<void>;
}

export type { PaymentMethodRepository };
