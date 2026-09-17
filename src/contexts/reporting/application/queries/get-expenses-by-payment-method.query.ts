// src/contexts/reporting/application/queries/get-expenses-by-payment-method.query.ts
import type { Period } from "../../../../shared-kernel/domain/period.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { GetPaymentMethodsQuery } from "../../../financial-tracking/application/queries/get-payment-methods.query.js";
import type { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import type { PaymentMethodId } from "../../../financial-tracking/domain/value-objects/payment-method-id.js";
import type { PaymentMethodName } from "../../../financial-tracking/domain/value-objects/payment-method-name.js";
import type { PaymentMethodPeriodAggregateRepository } from "../../domain/repositories/payment-method-period-aggregate.repository.js";

interface GetExpensesByPaymentMethodInput {
  familyId: FamilyId;
  period: Period;
}

interface ExpensesByPaymentMethodDTO {
  paymentMethodId: PaymentMethodId;
  paymentMethodName: PaymentMethodName;
  amount: Money;
}

class GetExpensesByPaymentMethodQuery {
  constructor(
    private readonly aggregateRepository: PaymentMethodPeriodAggregateRepository,
    private readonly getPaymentMethodsQuery: GetPaymentMethodsQuery,
  ) {}

  async execute(input: GetExpensesByPaymentMethodInput): Promise<ExpensesByPaymentMethodDTO[]> {
    const [aggregates, paymentMethods] = await Promise.all([
      this.aggregateRepository.findByFamilyIdAndPeriod(input.familyId, input.period),
      this.getPaymentMethodsQuery.execute({ familyId: input.familyId, includeDeprecated: true }),
    ]);
    const paymentMethodsById = new Map(
      paymentMethods.map((paymentMethod) => [paymentMethod.id.toString(), paymentMethod]),
    );

    return aggregates
      .map((aggregate) => ({
        paymentMethod: paymentMethodsById.get(aggregate.paymentMethodId.toString()),
        amount: aggregate.totalExpense,
      }))
      .filter(
        (
          entry,
        ): entry is { paymentMethod: NonNullable<typeof entry.paymentMethod>; amount: Money } =>
          entry.paymentMethod !== undefined && entry.amount.amount > 0,
      )
      .map(({ paymentMethod, amount }) => ({
        paymentMethodId: paymentMethod.id,
        paymentMethodName: paymentMethod.name,
        amount,
      }))
      .sort((first, second) => second.amount.amount - first.amount.amount);
  }
}

export type { ExpensesByPaymentMethodDTO, GetExpensesByPaymentMethodInput };
export { GetExpensesByPaymentMethodQuery };
