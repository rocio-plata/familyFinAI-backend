// src/contexts/financial-tracking/application/commands/delete-payment-method.usecase.ts
import type { GetFamilyMembershipQuery } from "../../../family-access/application/queries/get-family-membership.query.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import { InsufficientRoleError } from "../../domain/errors/insufficient-role.error.js";
import { PaymentMethodIsSomeonesDefaultError } from "../../domain/errors/payment-method-is-someones-default.error.js";
import { PaymentMethodNotFoundError } from "../../domain/errors/payment-method-not-found.error.js";
import type { PaymentMethodRepository } from "../../domain/repositories/payment-method.repository.js";
import type { UserPaymentMethodPreferenceRepository } from "../../domain/repositories/user-payment-method-preference.repository.js";
import type { PaymentMethodDeletionService } from "../../domain/services/payment-method-deletion.service.js";
import type { PaymentMethodId } from "../../domain/value-objects/payment-method-id.js";

interface DeletePaymentMethodInput {
  familyId: FamilyId;
  requestedBy: UserId;
  paymentMethodId: PaymentMethodId;
}

class DeletePaymentMethodUseCase {
  constructor(
    private readonly paymentMethodRepository: PaymentMethodRepository,
    private readonly preferenceRepository: UserPaymentMethodPreferenceRepository,
    private readonly paymentMethodDeletionService: PaymentMethodDeletionService,
    private readonly getFamilyMembership: GetFamilyMembershipQuery,
  ) {}

  async execute(input: DeletePaymentMethodInput): Promise<void> {
    const membership = await this.getFamilyMembership.execute({
      familyId: input.familyId,
      userId: input.requestedBy,
    });
    if (!membership) {
      throw new InsufficientRoleError();
    }

    const paymentMethod = await this.paymentMethodRepository.findById(input.paymentMethodId);
    if (!paymentMethod?.familyId.equals(input.familyId)) {
      throw new PaymentMethodNotFoundError(input.paymentMethodId.toString());
    }

    if (await this.preferenceRepository.existsAnyForPaymentMethod(paymentMethod.id)) {
      throw new PaymentMethodIsSomeonesDefaultError(paymentMethod.id.toString());
    }

    await this.paymentMethodDeletionService.delete(paymentMethod);
    await this.paymentMethodRepository.delete(paymentMethod.id);
  }
}

export type { DeletePaymentMethodInput };
export { DeletePaymentMethodUseCase };
