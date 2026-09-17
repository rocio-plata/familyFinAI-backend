// src/contexts/financial-tracking/application/commands/set-default-payment-method.usecase.ts
import type { GetFamilyMembershipQuery } from "../../../family-access/application/queries/get-family-membership.query.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import { UserPaymentMethodPreference } from "../../domain/entities/user-payment-method-preference.js";
import { InsufficientRoleError } from "../../domain/errors/insufficient-role.error.js";
import { PaymentMethodNotActiveError } from "../../domain/errors/payment-method-not-active.error.js";
import { PaymentMethodNotFoundError } from "../../domain/errors/payment-method-not-found.error.js";
import type { PaymentMethodRepository } from "../../domain/repositories/payment-method.repository.js";
import type { UserPaymentMethodPreferenceRepository } from "../../domain/repositories/user-payment-method-preference.repository.js";
import { CategoryStatus } from "../../domain/value-objects/category-status.js";
import type { PaymentMethodId } from "../../domain/value-objects/payment-method-id.js";

interface SetDefaultPaymentMethodInput {
  userId: UserId;
  familyId: FamilyId;
  paymentMethodId: PaymentMethodId;
}

class SetDefaultPaymentMethodUseCase {
  constructor(
    private readonly paymentMethodRepository: PaymentMethodRepository,
    private readonly preferenceRepository: UserPaymentMethodPreferenceRepository,
    private readonly getFamilyMembership: GetFamilyMembershipQuery,
  ) {}

  async execute(input: SetDefaultPaymentMethodInput): Promise<void> {
    const membership = await this.getFamilyMembership.execute({
      familyId: input.familyId,
      userId: input.userId,
    });
    if (!membership) {
      throw new InsufficientRoleError();
    }

    const paymentMethod = await this.paymentMethodRepository.findById(input.paymentMethodId);
    if (!paymentMethod?.familyId.equals(input.familyId)) {
      throw new PaymentMethodNotFoundError(input.paymentMethodId.toString());
    }
    if (paymentMethod.status !== CategoryStatus.Active) {
      throw new PaymentMethodNotActiveError(paymentMethod.id.toString());
    }

    const preference = await this.preferenceRepository.findByUserAndFamily(
      input.userId,
      input.familyId,
    );
    if (preference) {
      preference.changeDefault(paymentMethod.id);
      await this.preferenceRepository.save(preference);
      return;
    }

    await this.preferenceRepository.save(
      UserPaymentMethodPreference.create(input.userId, input.familyId, paymentMethod.id),
    );
  }
}

export type { SetDefaultPaymentMethodInput };
export { SetDefaultPaymentMethodUseCase };
