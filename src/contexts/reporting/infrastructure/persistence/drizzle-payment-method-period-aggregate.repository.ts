// src/contexts/reporting/infrastructure/persistence/drizzle-payment-method-period-aggregate.repository.ts
import { and, eq } from "drizzle-orm";
import { db } from "../../../../platform/db/connection.js";
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Period } from "../../../../shared-kernel/domain/period.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { PaymentMethodId } from "../../../financial-tracking/domain/value-objects/payment-method-id.js";
import { PaymentMethodPeriodAggregate } from "../../domain/entities/payment-method-period-aggregate.js";
import type { PaymentMethodPeriodAggregateRepository } from "../../domain/repositories/payment-method-period-aggregate.repository.js";
import { paymentMethodPeriodAggregates } from "./schema.js";

class DrizzlePaymentMethodPeriodAggregateRepository
  implements PaymentMethodPeriodAggregateRepository
{
  async save(aggregate: PaymentMethodPeriodAggregate): Promise<void> {
    await db
      .insert(paymentMethodPeriodAggregates)
      .values({
        familyId: aggregate.familyId.toString(),
        paymentMethodId: aggregate.paymentMethodId.toString(),
        period: aggregate.period.toString(),
        totalExpense: aggregate.totalExpense.amount.toString(),
        totalIncome: aggregate.totalIncome.amount.toString(),
        currency: aggregate.totalExpense.currency.toString(),
        itemCount: aggregate.itemCount.value,
      })
      .onConflictDoUpdate({
        target: [
          paymentMethodPeriodAggregates.familyId,
          paymentMethodPeriodAggregates.paymentMethodId,
          paymentMethodPeriodAggregates.period,
        ],
        set: {
          totalExpense: aggregate.totalExpense.amount.toString(),
          totalIncome: aggregate.totalIncome.amount.toString(),
          currency: aggregate.totalExpense.currency.toString(),
          itemCount: aggregate.itemCount.value,
        },
      });
  }

  async findByFamilyIdAndPeriod(
    familyId: FamilyId,
    period: Period,
  ): Promise<PaymentMethodPeriodAggregate[]> {
    const rows = await db
      .select()
      .from(paymentMethodPeriodAggregates)
      .where(
        and(
          eq(paymentMethodPeriodAggregates.familyId, familyId.toString()),
          eq(paymentMethodPeriodAggregates.period, period.toString()),
        ),
      );
    return rows.map((row) =>
      PaymentMethodPeriodAggregate.reconstitute({
        familyId: FamilyId.of(row.familyId),
        paymentMethodId: PaymentMethodId.of(row.paymentMethodId),
        period: Period.of(Number(row.period.slice(0, 4)), Number(row.period.slice(5, 7))),
        currency: Currency.of(row.currency),
        totalExpense: Number(row.totalExpense),
        totalIncome: Number(row.totalIncome),
        itemCount: row.itemCount,
      }),
    );
  }
}

export { DrizzlePaymentMethodPeriodAggregateRepository };
