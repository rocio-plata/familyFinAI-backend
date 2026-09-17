// src/contexts/financial-tracking/application/commands/create-default-payment-methods.usecase.ts
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import { PaymentMethod } from "../../domain/entities/payment-method.js";
import { UserPaymentMethodPreference } from "../../domain/entities/user-payment-method-preference.js";
import type { PaymentMethodRepository } from "../../domain/repositories/payment-method.repository.js";
import type { UserPaymentMethodPreferenceRepository } from "../../domain/repositories/user-payment-method-preference.repository.js";
import { PaymentMethodName } from "../../domain/value-objects/payment-method-name.js";

interface CreateDefaultPaymentMethodsInput {
  familyId: FamilyId;
  creatorId: UserId;
}

class CreateDefaultPaymentMethodsUseCase {
  private static readonly DEFAULT_PAYMENT_METHOD_NAMES = [
    "Efectivo",
    "Tarjeta de Débito",
    "Tarjeta de Crédito",
    "Transferencia",
  ];

  constructor(
    private readonly paymentMethodRepository: PaymentMethodRepository,
    private readonly preferenceRepository: UserPaymentMethodPreferenceRepository,
  ) {}

  async execute(input: CreateDefaultPaymentMethodsInput): Promise<void> {
    const familyPaymentMethods = await this.paymentMethodRepository.findByFamilyId(input.familyId);
    let cashPaymentMethod = familyPaymentMethods.find((paymentMethod) =>
      paymentMethod.name.equals(PaymentMethodName.of("Efectivo")),
    );

    for (const name of CreateDefaultPaymentMethodsUseCase.DEFAULT_PAYMENT_METHOD_NAMES) {
      const paymentMethodName = PaymentMethodName.of(name);
      const existingPaymentMethod = familyPaymentMethods.find((paymentMethod) =>
        paymentMethod.name.equals(paymentMethodName),
      );

      if (existingPaymentMethod) {
        if (name === "Efectivo") cashPaymentMethod = existingPaymentMethod;
        continue;
      }

      const paymentMethod = PaymentMethod.create(input.familyId, paymentMethodName);
      await this.paymentMethodRepository.save(paymentMethod);
      familyPaymentMethods.push(paymentMethod);

      if (name === "Efectivo") cashPaymentMethod = paymentMethod;
    }

    const existingPreference = await this.preferenceRepository.findByUserAndFamily(
      input.creatorId,
      input.familyId,
    );
    if (!existingPreference && cashPaymentMethod) {
      await this.preferenceRepository.save(
        UserPaymentMethodPreference.create(input.creatorId, input.familyId, cashPaymentMethod.id),
      );
    }
  }
}

export type { CreateDefaultPaymentMethodsInput };
export { CreateDefaultPaymentMethodsUseCase };
