// tests/contexts/reporting/get-drill-down.query.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { GetCategoriesQuery } from "../../../src/contexts/financial-tracking/application/queries/get-categories.query.js";
import { GetFinancialItemsQuery } from "../../../src/contexts/financial-tracking/application/queries/get-financial-items.query.js";
import { Category } from "../../../src/contexts/financial-tracking/domain/entities/category.js";
import { FinancialItem } from "../../../src/contexts/financial-tracking/domain/entities/financial-item.js";
import { CategoryAssignment } from "../../../src/contexts/financial-tracking/domain/value-objects/category-assignment.js";
import { CategoryName } from "../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { FinancialItemType } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import type { TagId } from "../../../src/contexts/financial-tracking/domain/value-objects/tag-id.js";
import { TagName } from "../../../src/contexts/financial-tracking/domain/value-objects/tag-name.js";
import { Title } from "../../../src/contexts/financial-tracking/domain/value-objects/title.js";
import { TransactionDate } from "../../../src/contexts/financial-tracking/domain/value-objects/transaction-date.js";
import { GetCategoryBreakdownQuery } from "../../../src/contexts/reporting/application/queries/get-category-breakdown.query.js";
import { GetDrillDownQuery } from "../../../src/contexts/reporting/application/queries/get-drill-down.query.js";
import { CategoryPeriodAggregate } from "../../../src/contexts/reporting/domain/entities/category-period-aggregate.js";
import { TagWithoutCategoryError } from "../../../src/contexts/reporting/domain/errors/tag-without-category.error.js";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../src/shared-kernel/domain/period.js";
import { InMemoryCategoryRepository } from "../financial-tracking/doubles/in-memory-category.repository.js";
import { InMemoryFinancialItemRepository } from "../financial-tracking/doubles/in-memory-financial-item.repository.js";
import { InMemoryCategoryPeriodAggregateRepository } from "./doubles/in-memory-category-period-aggregate.repository.js";

describe("GetDrillDownQuery", () => {
  let query: GetDrillDownQuery;
  let aggregateRepository: InMemoryCategoryPeriodAggregateRepository;
  let categoryRepository: InMemoryCategoryRepository;
  let financialItemRepository: InMemoryFinancialItemRepository;
  let familyId: FamilyId;
  let period: Period;
  let category: Category;
  let firstTagId: TagId;
  let secondTagId: TagId;

  beforeEach(() => {
    aggregateRepository = new InMemoryCategoryPeriodAggregateRepository();
    categoryRepository = new InMemoryCategoryRepository();
    financialItemRepository = new InMemoryFinancialItemRepository();
    query = new GetDrillDownQuery(
      new GetCategoryBreakdownQuery(
        aggregateRepository,
        new GetCategoriesQuery(categoryRepository),
      ),
      new GetFinancialItemsQuery(financialItemRepository),
      new GetCategoriesQuery(categoryRepository),
    );
    familyId = FamilyId.generate();
    period = Period.of(2026, 8);
    category = Category.create(
      familyId,
      FinancialItemType.Expense,
      CategoryName.of("Supermercado"),
    );
    category.addTag(TagName.of("Alimentos"));
    category.addTag(TagName.of("Limpieza"));
    firstTagId = category.tags[0].id;
    secondTagId = category.tags[1].id;
    categoryRepository.add(category);
  });

  test("devuelve el desglose por categoría cuando no recibe categoría", async () => {
    const aggregate = CategoryPeriodAggregate.create(
      familyId,
      category.id,
      period,
      Currency.default(),
    );
    aggregate.registerItem(FinancialItemType.Expense, Money.of(75_000, Currency.default()));
    await aggregateRepository.save(aggregate);

    const result = await query.execute({ familyId, period });

    assert.equal(result.level, "category");
    assert.equal(result.entries[0].categoryName.toString(), "Supermercado");
    assert.equal(result.entries[0].amount.amount, 75_000);
  });

  test("agrupa por tag dentro de una categoría", async () => {
    await saveItem(firstTagId, "Compra alimentos", 30_000, "2026-08-10");
    await saveItem(firstTagId, "Compra frutas", 20_000, "2026-08-11");
    await saveItem(secondTagId, "Productos limpieza", 15_000, "2026-08-12");

    const result = await query.execute({ familyId, period, categoryId: category.id });

    assert.equal(result.level, "tag");
    assert.deepEqual(
      result.entries.map((entry) => ({
        name: entry.tagName.toString(),
        amount: entry.amount.amount,
      })),
      [
        { name: "Alimentos", amount: 50_000 },
        { name: "Limpieza", amount: 15_000 },
      ],
    );
  });

  test("devuelve los items cuando recibe categoría y tag", async () => {
    await saveItem(firstTagId, "Compra alimentos", 30_000, "2026-08-10");

    const result = await query.execute({
      familyId,
      period,
      categoryId: category.id,
      tagId: firstTagId,
    });

    assert.equal(result.level, "item");
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].title.toString(), "Compra alimentos");
  });

  test("rechaza un tag sin categoría", async () => {
    await assert.rejects(
      query.execute({ familyId, period, tagId: firstTagId }),
      TagWithoutCategoryError,
    );
  });

  async function saveItem(
    tagId: TagId,
    title: string,
    amount: number,
    occurredOn: string,
  ): Promise<void> {
    const item = FinancialItem.create(
      {
        familyId,
        recordedBy: UserId.generate(),
        amount: Money.of(amount, Currency.default()),
        category: CategoryAssignment.of(category.id, tagId),
        title: Title.of(title),
        occurredOn: TransactionDate.of(new Date(`${occurredOn}T12:00:00.000Z`)),
      },
      FinancialItemType.Expense,
    );
    await financialItemRepository.save(item);
  }
});
