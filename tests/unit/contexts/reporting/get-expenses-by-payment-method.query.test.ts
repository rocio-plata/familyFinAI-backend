// tests/unit/contexts/reporting/get-expenses-by-payment-method.query.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { GetPaymentMethodsQuery } from "../../../../src/contexts/financial-tracking/application/queries/get-payment-methods.query.js";
import { PaymentMethod } from "../../../../src/contexts/financial-tracking/domain/entities/payment-method.js";
import { FinancialItemType } from "../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { PaymentMethodName } from "../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-name.js";
import { InMemoryPaymentMethodRepository } from "../../../../src/contexts/financial-tracking/infrastructure/persistence/in-memory-payment-method.repository.js";
import { GetExpensesByPaymentMethodQuery } from "../../../../src/contexts/reporting/application/queries/get-expenses-by-payment-method.query.js";
import { PaymentMethodPeriodAggregate } from "../../../../src/contexts/reporting/domain/entities/payment-method-period-aggregate.js";
import { InMemoryPaymentMethodPeriodAggregateRepository } from "../../../../src/contexts/reporting/infrastructure/persistence/in-memory-payment-method-period-aggregate.repository.js";
import { Currency } from "../../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../../src/shared-kernel/domain/period.js";

describe("GetExpensesByPaymentMethodQuery", () => {
  let aggregateRepository: InMemoryPaymentMethodPeriodAggregateRepository;
  let paymentMethodRepository: InMemoryPaymentMethodRepository;
  let query: GetExpensesByPaymentMethodQuery;
  let familyId: FamilyId;
  let period: Period;

  beforeEach(() => {
    aggregateRepository = new InMemoryPaymentMethodPeriodAggregateRepository();
    paymentMethodRepository = new InMemoryPaymentMethodRepository();
    query = new GetExpensesByPaymentMethodQuery(
      aggregateRepository,
      new GetPaymentMethodsQuery(paymentMethodRepository),
    );
    familyId = FamilyId.generate();
    period = Period.of(2026, 8);
  });

  test("devuelve gastos ordenados y con nombre del medio", async () => {
    const cash = PaymentMethod.create(familyId, PaymentMethodName.of("Efectivo"));
    const card = PaymentMethod.create(familyId, PaymentMethodName.of("Tarjeta"));
    await paymentMethodRepository.save(cash);
    await paymentMethodRepository.save(card);
    const cashAggregate = PaymentMethodPeriodAggregate.create(
      familyId,
      cash.id,
      period,
      Currency.default(),
    );
    const cardAggregate = PaymentMethodPeriodAggregate.create(
      familyId,
      card.id,
      period,
      Currency.default(),
    );
    cashAggregate.registerItem(FinancialItemType.Expense, Money.of(25_000, Currency.default()));
    cardAggregate.registerItem(FinancialItemType.Expense, Money.of(75_000, Currency.default()));
    await aggregateRepository.save(cashAggregate);
    await aggregateRepository.save(cardAggregate);

    const result = await query.execute({ familyId, period });

    assert.deepEqual(
      result.map((entry) => ({
        name: entry.paymentMethodName.toString(),
        amount: entry.amount.amount,
      })),
      [
        { name: "Tarjeta", amount: 75_000 },
        { name: "Efectivo", amount: 25_000 },
      ],
    );
  });

  test("ignora ingresos y gastos en cero", async () => {
    const method = PaymentMethod.create(familyId, PaymentMethodName.of("Efectivo"));
    await paymentMethodRepository.save(method);
    const aggregate = PaymentMethodPeriodAggregate.create(
      familyId,
      method.id,
      period,
      Currency.default(),
    );
    aggregate.registerItem(FinancialItemType.Income, Money.of(100_000, Currency.default()));
    await aggregateRepository.save(aggregate);

    assert.deepEqual(await query.execute({ familyId, period }), []);
  });

  test("incluye medios deprecados y descarta medios ausentes del catálogo", async () => {
    const deprecated = PaymentMethod.create(familyId, PaymentMethodName.of("Antiguo"));
    deprecated.deprecate();
    const missingId = PaymentMethod.create(familyId, PaymentMethodName.of("Borrado")).id;
    await paymentMethodRepository.save(deprecated);
    const aggregate = PaymentMethodPeriodAggregate.create(
      familyId,
      deprecated.id,
      period,
      Currency.default(),
    );
    aggregate.registerItem(FinancialItemType.Expense, Money.of(10_000, Currency.default()));
    const missingAggregate = PaymentMethodPeriodAggregate.create(
      familyId,
      missingId,
      period,
      Currency.default(),
    );
    missingAggregate.registerItem(FinancialItemType.Expense, Money.of(20_000, Currency.default()));
    await aggregateRepository.save(aggregate);
    await aggregateRepository.save(missingAggregate);

    const result = await query.execute({ familyId, period });

    assert.equal(result.length, 1);
    assert.equal(result[0]?.paymentMethodName.toString(), "Antiguo");
  });

  test("no mezcla datos de otra familia", async () => {
    const method = PaymentMethod.create(FamilyId.generate(), PaymentMethodName.of("Efectivo"));
    await paymentMethodRepository.save(method);
    const aggregate = PaymentMethodPeriodAggregate.create(
      method.familyId,
      method.id,
      period,
      Currency.default(),
    );
    aggregate.registerItem(FinancialItemType.Expense, Money.of(50_000, Currency.default()));
    await aggregateRepository.save(aggregate);

    assert.deepEqual(await query.execute({ familyId, period }), []);
  });
});
