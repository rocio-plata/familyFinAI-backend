// tests/contexts/financial-tracking/get-financial-items.query.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { GetFinancialItemsQuery } from "../../../src/contexts/financial-tracking/application/queries/get-financial-items.query.js";
import { FinancialItem } from "../../../src/contexts/financial-tracking/domain/entities/financial-item.js";
import { CategoryAssignment } from "../../../src/contexts/financial-tracking/domain/value-objects/category-assignment.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemType } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { TagId } from "../../../src/contexts/financial-tracking/domain/value-objects/tag-id.js";
import { Title } from "../../../src/contexts/financial-tracking/domain/value-objects/title.js";
import { TransactionDate } from "../../../src/contexts/financial-tracking/domain/value-objects/transaction-date.js";
import { InMemoryFinancialItemRepository } from "./doubles/in-memory-financial-item.repository.js";

describe("GetFinancialItemsQuery", () => {
  let query: GetFinancialItemsQuery;
  let repository: InMemoryFinancialItemRepository;
  let familyId: FamilyId;
  let recordedBy: UserId;
  let categoryId: CategoryId;
  let otherCategoryId: CategoryId;
  let tagId: TagId;
  let expenseItem: FinancialItem;
  let incomeItem: FinancialItem;

  beforeEach(async () => {
    repository = new InMemoryFinancialItemRepository();
    query = new GetFinancialItemsQuery(repository);

    familyId = FamilyId.generate();
    recordedBy = UserId.generate();
    categoryId = CategoryId.generate();
    otherCategoryId = CategoryId.generate();
    tagId = TagId.generate();

    expenseItem = FinancialItem.create({
      familyId,
      recordedBy,
      type: FinancialItemType.Expense,
      amount: Money.of(5000, "CLP"),
      category: CategoryAssignment.of(categoryId, tagId),
      title: Title.of("Compra en el supermercado"),
      occurredOn: TransactionDate.of(new Date("2026-08-01")),
    });
    await repository.save(expenseItem);

    incomeItem = FinancialItem.create({
      familyId,
      recordedBy,
      type: FinancialItemType.Income,
      amount: Money.of(500000, "CLP"),
      category: CategoryAssignment.of(otherCategoryId),
      title: Title.of("Sueldo"),
      occurredOn: TransactionDate.of(new Date("2026-08-15")),
    });
    await repository.save(incomeItem);
  });

  test("lista todos los movimientos de la familia", async () => {
    const items = await query.execute({ familyId });

    assert.equal(items.length, 2);
  });

  test("devuelve lista vacía si la familia no tiene movimientos", async () => {
    const items = await query.execute({ familyId: FamilyId.generate() });

    assert.deepEqual(items, []);
  });

  test("filtra por categoryId", async () => {
    const items = await query.execute({ familyId, categoryId });

    assert.equal(items.length, 1);
    assert.equal(items[0].id.toString(), expenseItem.id.toString());
  });

  test("filtra por tagId", async () => {
    const items = await query.execute({ familyId, tagId });

    assert.equal(items.length, 1);
    assert.equal(items[0].id.toString(), expenseItem.id.toString());
  });

  test("filtra por type", async () => {
    const items = await query.execute({ familyId, type: FinancialItemType.Income });

    assert.equal(items.length, 1);
    assert.equal(items[0].id.toString(), incomeItem.id.toString());
  });

  test("filtra por period", async () => {
    const items = await query.execute({
      familyId,
      period: { from: new Date("2026-08-10"), to: new Date("2026-08-31") },
    });

    assert.equal(items.length, 1);
    assert.equal(items[0].id.toString(), incomeItem.id.toString());
  });

  test("mapea los campos del item a DTO", async () => {
    const items = await query.execute({ familyId, categoryId });

    const [dto] = items;
    assert.equal(dto.id.toString(), expenseItem.id.toString());
    assert.equal(dto.familyId.toString(), familyId.toString());
    assert.equal(dto.recordedBy.toString(), recordedBy.toString());
    assert.equal(dto.type, FinancialItemType.Expense);
    assert.equal(dto.amount.amount, 5000);
    assert.equal(dto.categoryId.toString(), categoryId.toString());
    assert.equal(dto.tagId?.toString(), tagId.toString());
    assert.equal(dto.title.toString(), "Compra en el supermercado");
  });
});
