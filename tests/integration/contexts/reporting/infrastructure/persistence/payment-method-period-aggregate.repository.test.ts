// tests/integration/contexts/reporting/infrastructure/persistence/payment-method-period-aggregate.repository.test.ts
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import { FamilyId } from "../../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FinancialItemType } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { PaymentMethodId } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-id.js";
import { PaymentMethodPeriodAggregate } from "../../../../../../src/contexts/reporting/domain/entities/payment-method-period-aggregate.js";
import { DrizzlePaymentMethodPeriodAggregateRepository } from "../../../../../../src/contexts/reporting/infrastructure/persistence/drizzle-payment-method-period-aggregate.repository.js";
import { paymentMethodPeriodAggregates } from "../../../../../../src/contexts/reporting/infrastructure/persistence/schema.js";
import { db } from "../../../../../../src/platform/db/connection.js";
import { Currency } from "../../../../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../../../../src/shared-kernel/domain/period.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const skip = hasDatabase ? false : "requiere DATABASE_URL";

const repository = new DrizzlePaymentMethodPeriodAggregateRepository();
const createdKeys: { familyId: string; paymentMethodId: string; period: string }[] = [];

after(async () => {
  if (!hasDatabase) return;
  for (const key of createdKeys) {
    await db
      .delete(paymentMethodPeriodAggregates)
      .where(
        and(
          eq(paymentMethodPeriodAggregates.familyId, key.familyId),
          eq(paymentMethodPeriodAggregates.paymentMethodId, key.paymentMethodId),
          eq(paymentMethodPeriodAggregates.period, key.period),
        ),
      );
  }
});

describe("Persistencia Drizzle de agregados de medio de pago por período (integración)", () => {
  test("guarda, acumula un movimiento y recupera el agregado", { skip }, async () => {
    const familyId = FamilyId.generate();
    const paymentMethodId = PaymentMethodId.generate();
    const period = Period.of(2026, 3);
    const currency = Currency.of("CLP");
    const aggregate = PaymentMethodPeriodAggregate.create(
      familyId,
      paymentMethodId,
      period,
      currency,
    );
    createdKeys.push({
      familyId: familyId.toString(),
      paymentMethodId: paymentMethodId.toString(),
      period: period.toString(),
    });

    aggregate.registerItem(FinancialItemType.Income, Money.of(20000, currency));
    await repository.save(aggregate);

    const found = await repository.findByFamilyIdAndPeriod(familyId, period);
    assert.equal(found.length, 1);
    assert.equal(found[0]?.totalIncome.amount, 20000);
    assert.equal(found[0]?.itemCount.value, 1);
  });
});
