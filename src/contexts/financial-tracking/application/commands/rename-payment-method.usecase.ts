// src/contexts/financial-tracking/application/commands/rename-payment-method.usecase.ts
import type { GetFamilyMembershipQuery } from "../../../family-access/application/queries/get-family-membership.query.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import type { PaymentMethod } from "../../domain/entities/payment-method.js";
import { DuplicatePaymentMethodNameError } from "../../domain/errors/duplicate-payment-method-name.error.js";
import { InsufficientRoleError } from "../../domain/errors/insufficient-role.error.js";
import { PaymentMethodNotFoundError } from "../../domain/errors/payment-method-not-found.error.js";
import type { PaymentMethodRepository } from "../../domain/repositories/payment-method.repository.js";
import type { PaymentMethodId } from "../../domain/value-objects/payment-method-id.js";
import type { PaymentMethodName } from "../../domain/value-objects/payment-method-name.js";

interface RenamePaymentMethodInput {
  familyId: FamilyId;
  requestedBy: UserId;
  paymentMethodId: PaymentMethodId;
  newName: PaymentMethodName;
}

class RenamePaymentMethodUseCase {
  constructor(
    private readonly paymentMethodRepository: PaymentMethodRepository,
    private readonly getFamilyMembership: GetFamilyMembershipQuery,
  ) {}

  async execute(input: RenamePaymentMethodInput): Promise<PaymentMethod> {
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

    const duplicate = (await this.paymentMethodRepository.findByFamilyId(input.familyId)).some(
      (other) => !other.id.equals(paymentMethod.id) && other.name.equals(input.newName),
    );
    if (duplicate) {
      throw new DuplicatePaymentMethodNameError(input.newName.toString());
    }

    paymentMethod.rename(input.newName);
    await this.paymentMethodRepository.save(paymentMethod);

    return paymentMethod;
  }
}

export type { RenamePaymentMethodInput };
export { RenamePaymentMethodUseCase };
