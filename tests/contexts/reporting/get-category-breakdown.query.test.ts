// tests/contexts/reporting/get-category-breakdown.query.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { GetCategoriesQuery } from "../../../src/contexts/financial-tracking/application/queries/get-categories.query.js";
import { Category } from "../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryName } from "../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { FinancialItemType } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { GetCategoryBreakdownQuery } from "../../../src/contexts/reporting/application/queries/get-category-breakdown.query.js";
import { CategoryPeriodAggregate } from "../../../src/contexts/reporting/domain/entities/category-period-aggregate.js";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../src/shared-kernel/domain/period.js";
import { InMemoryCategoryRepository } from "../financial-tracking/doubles/in-memory-category.repository.js";
import { InMemoryCategoryPeriodAggregateRepository } from "./doubles/in-memory-category-period-aggregate.repository.js";

describe("GetCategoryBreakdownQuery", () => {
  let aggregateRepository: InMemoryCategoryPeriodAggregateRepository;
  let categoryRepository: InMemoryCategoryRepository;
  let query: GetCategoryBreakdownQuery;
  let familyId: FamilyId;
  let period: Period;

  beforeEach(() => {
    aggregateRepository = new InMemoryCategoryPeriodAggregateRepository();
    categoryRepository = new InMemoryCategoryRepository();
    query = new GetCategoryBreakdownQuery(
      aggregateRepository,
      new GetCategoriesQuery(categoryRepository),
    );
    familyId = FamilyId.generate();
    period = Period.of(2026, 8);
  });

  test("devuelve el desglose de gastos ordenado con el nombre de cada categoría", async () => {
    const groceries = Category.create(
      familyId,
      FinancialItemType.Expense,
      CategoryName.of("Supermercado"),
    );
    const transport = Category.create(
      familyId,
      FinancialItemType.Expense,
      CategoryName.of("Transporte"),
    );
    const salary = Category.create(familyId, FinancialItemType.Income, CategoryName.of("Sueldo"));
    categoryRepository.add(groceries);
    categoryRepository.add(transport);
    categoryRepository.add(salary);

    const groceriesAggregate = CategoryPeriodAggregate.create(
      familyId,
      groceries.id,
      period,
      Currency.default(),
    );
    groceriesAggregate.registerItem(
      FinancialItemType.Expense,
      Money.of(75_000, Currency.default()),
    );
    const transportAggregate = CategoryPeriodAggregate.create(
      familyId,
      transport.id,
      period,
      Currency.default(),
    );
    transportAggregate.registerItem(
      FinancialItemType.Expense,
      Money.of(25_000, Currency.default()),
    );
    const salaryAggregate = CategoryPeriodAggregate.create(
      familyId,
      salary.id,
      period,
      Currency.default(),
    );
    salaryAggregate.registerItem(FinancialItemType.Income, Money.of(700_000, Currency.default()));
    await aggregateRepository.save(groceriesAggregate);
    await aggregateRepository.save(transportAggregate);
    await aggregateRepository.save(salaryAggregate);

    const breakdown = await query.execute({ familyId, period });

    assert.deepEqual(
      breakdown.map((category) => ({
        categoryId: category.categoryId.toString(),
        categoryName: category.categoryName.toString(),
        amount: category.amount.amount,
      })),
      [
        { categoryId: groceries.id.toString(), categoryName: "Supermercado", amount: 75_000 },
        { categoryId: transport.id.toString(), categoryName: "Transporte", amount: 25_000 },
      ],
    );
  });

  test("devuelve los ingresos cuando se solicita ese tipo", async () => {
    const salary = Category.create(familyId, FinancialItemType.Income, CategoryName.of("Sueldo"));
    categoryRepository.add(salary);
    const aggregate = CategoryPeriodAggregate.create(
      familyId,
      salary.id,
      period,
      Currency.default(),
    );
    aggregate.registerItem(FinancialItemType.Income, Money.of(700_000, Currency.default()));
    await aggregateRepository.save(aggregate);

    const breakdown = await query.execute({ familyId, period, type: FinancialItemType.Income });

    assert.equal(breakdown.length, 1);
    assert.equal(breakdown[0].categoryName.toString(), "Sueldo");
    assert.equal(breakdown[0].amount.amount, 700_000);
  });

  test("devuelve una lista vacía cuando no hay movimientos del tipo solicitado", async () => {
    const breakdown = await query.execute({ familyId, period });

    assert.deepEqual(breakdown, []);
  });
});
