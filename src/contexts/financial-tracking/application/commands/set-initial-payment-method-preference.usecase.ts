// src/contexts/financial-tracking/application/commands/set-initial-payment-method-preference.usecase.ts
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import { UserPaymentMethodPreference } from "../../domain/entities/user-payment-method-preference.js";
import { PaymentMethodNotActiveError } from "../../domain/errors/payment-method-not-active.error.js";
import { PaymentMethodNotFoundError } from "../../domain/errors/payment-method-not-found.error.js";
import type { PaymentMethodRepository } from "../../domain/repositories/payment-method.repository.js";
import type { UserPaymentMethodPreferenceRepository } from "../../domain/repositories/user-payment-method-preference.repository.js";
import { CategoryStatus } from "../../domain/value-objects/category-status.js";
import { PaymentMethodName } from "../../domain/value-objects/payment-method-name.js";

interface SetInitialPaymentMethodPreferenceInput {
  userId: UserId;
  familyId: FamilyId;
}

class SetInitialPaymentMethodPreferenceUseCase {
  constructor(
    private readonly paymentMethodRepository: PaymentMethodRepository,
    private readonly preferenceRepository: UserPaymentMethodPreferenceRepository,
  ) {}

  async execute(input: SetInitialPaymentMethodPreferenceInput): Promise<void> {
    const existingPreference = await this.preferenceRepository.findByUserAndFamily(
      input.userId,
      input.familyId,
    );
    if (existingPreference) return;

    const cash = (await this.paymentMethodRepository.findByFamilyId(input.familyId)).find(
      (paymentMethod) => paymentMethod.name.equals(PaymentMethodName.of("Efectivo")),
    );
    if (!cash) {
      throw new PaymentMethodNotFoundError("Efectivo");
    }
    if (cash.status !== CategoryStatus.Active) {
      throw new PaymentMethodNotActiveError(cash.id.toString());
    }

    await this.preferenceRepository.save(
      UserPaymentMethodPreference.create(input.userId, input.familyId, cash.id),
    );
  }
}

export type { SetInitialPaymentMethodPreferenceInput };
export { SetInitialPaymentMethodPreferenceUseCase };
