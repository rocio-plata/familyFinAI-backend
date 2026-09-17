// src/contexts/financial-tracking/application/commands/create-payment-method.usecase.ts
import type { GetFamilyMembershipQuery } from "../../../family-access/application/queries/get-family-membership.query.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import { PaymentMethod } from "../../domain/entities/payment-method.js";
import { DuplicatePaymentMethodNameError } from "../../domain/errors/duplicate-payment-method-name.error.js";
import { InsufficientRoleError } from "../../domain/errors/insufficient-role.error.js";
import type { PaymentMethodRepository } from "../../domain/repositories/payment-method.repository.js";
import type { PaymentMethodName } from "../../domain/value-objects/payment-method-name.js";

interface CreatePaymentMethodInput {
  familyId: FamilyId;
  requestedBy: UserId;
  name: PaymentMethodName;
}

class CreatePaymentMethodUseCase {
  constructor(
    private readonly paymentMethodRepository: PaymentMethodRepository,
    private readonly getFamilyMembership: GetFamilyMembershipQuery,
  ) {}

  async execute(input: CreatePaymentMethodInput): Promise<PaymentMethod> {
    const membership = await this.getFamilyMembership.execute({
      familyId: input.familyId,
      userId: input.requestedBy,
    });
    if (!membership) {
      throw new InsufficientRoleError();
    }

    const familyPaymentMethods = await this.paymentMethodRepository.findByFamilyId(input.familyId);
    if (familyPaymentMethods.some((paymentMethod) => paymentMethod.name.equals(input.name))) {
      throw new DuplicatePaymentMethodNameError(input.name.toString());
    }

    const paymentMethod = PaymentMethod.create(input.familyId, input.name);
    await this.paymentMethodRepository.save(paymentMethod);

    return paymentMethod;
  }
}

export type { CreatePaymentMethodInput };
export { CreatePaymentMethodUseCase };
