// src/contexts/financial-tracking/application/queries/get-payment-methods.query.ts
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { PaymentMethodRepository } from "../../domain/repositories/payment-method.repository.js";
import { CategoryStatus } from "../../domain/value-objects/category-status.js";
import type { PaymentMethodId } from "../../domain/value-objects/payment-method-id.js";
import type { PaymentMethodName } from "../../domain/value-objects/payment-method-name.js";

interface GetPaymentMethodsInput {
  familyId: FamilyId;
  includeDeprecated?: boolean;
}

interface PaymentMethodDTO {
  id: PaymentMethodId;
  familyId: FamilyId;
  name: PaymentMethodName;
  status: CategoryStatus;
}

class GetPaymentMethodsQuery {
  constructor(private readonly paymentMethodRepository: PaymentMethodRepository) {}

  async execute(input: GetPaymentMethodsInput): Promise<PaymentMethodDTO[]> {
    const paymentMethods = await this.paymentMethodRepository.findByFamilyId(input.familyId);
    const includeDeprecated = input.includeDeprecated ?? false;

    return paymentMethods
      .filter(
        (paymentMethod) => includeDeprecated || paymentMethod.status === CategoryStatus.Active,
      )
      .map((paymentMethod) => ({
        id: paymentMethod.id,
        familyId: paymentMethod.familyId,
        name: paymentMethod.name,
        status: paymentMethod.status,
      }));
  }
}

export type { GetPaymentMethodsInput, PaymentMethodDTO };
export { GetPaymentMethodsQuery };
