// tests/contexts/budgeting/create-budget-configuration.usecase.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { GetCategoriesQuery } from "../../../src/contexts/financial-tracking/application/queries/get-categories.query.js";
import { Category } from "../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryName } from "../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { FinancialItemType } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { CreateBudgetConfigurationUseCase } from "../../../src/contexts/budgeting/application/commands/create-budget-configuration.usecase.js";
import { BudgetConfiguration } from "../../../src/contexts/budgeting/domain/entities/budget-configuration.js";
import { BudgetCreated } from "../../../src/contexts/budgeting/domain/events/budget-created.event.js";
import { InMemoryCategoryRepository } from "../../contexts/financial-tracking/doubles/in-memory-category.repository.js";
import { InMemoryFamilyRepository } from "../../contexts/family-access/doubles/in-memory-family.repository.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";

describe("CreateBudgetConfigurationUseCase", () => {
  test("crea y persiste un presupuesto para una categoría de gasto activa", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const category = Category.create(
      family.id,
      FinancialItemType.Expense,
      CategoryName.of("Supermercado"),
    );
    const familyRepository = new InMemoryFamilyRepository();
    const categoryRepository = new InMemoryCategoryRepository();
    const budgetRepository = new InMemoryBudgetConfigurationRepository();
    const eventBus = new FakeEventBus();
    await familyRepository.save(family);
    await categoryRepository.save(category);
    const useCase = new CreateBudgetConfigurationUseCase(
      familyRepository,
      new GetCategoriesQuery(categoryRepository),
      budgetRepository,
      eventBus,
    );

    const budget = await useCase.execute({
      familyId: family.id,
      categoryId: category.id,
      defaultAmount: Money.of(150_000, "CLP"),
    });

    assert.equal(budget.familyId.toString(), family.id.toString());
    assert.equal(budget.categoryId.toString(), category.id.toString());
    assert.equal(budget.defaultAmount.amount, 150_000);
    assert.equal((await budgetRepository.findByFamilyId(family.id)).length, 1);
    assert.ok(eventBus.publishedEvents[0] instanceof BudgetCreated);
  });

  test("rechaza una categoría de ingreso", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const category = Category.create(
      family.id,
      FinancialItemType.Income,
      CategoryName.of("Sueldo"),
    );
    const familyRepository = new InMemoryFamilyRepository();
    const categoryRepository = new InMemoryCategoryRepository();
    await familyRepository.save(family);
    await categoryRepository.save(category);
    const useCase = new CreateBudgetConfigurationUseCase(
      familyRepository,
      new GetCategoriesQuery(categoryRepository),
      new InMemoryBudgetConfigurationRepository(),
      new FakeEventBus(),
    );

    await assert.rejects(
      useCase.execute({
        familyId: family.id,
        categoryId: category.id,
        defaultAmount: Money.of(100_000, "CLP"),
      }),
      { name: "CategoryNotExpenseError" },
    );
  });

  test("rechaza una configuración duplicada para la categoría", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const category = Category.create(
      family.id,
      FinancialItemType.Expense,
      CategoryName.of("Supermercado"),
    );
    const familyRepository = new InMemoryFamilyRepository();
    const categoryRepository = new InMemoryCategoryRepository();
    const budgetRepository = new InMemoryBudgetConfigurationRepository();
    await familyRepository.save(family);
    await categoryRepository.save(category);
    await budgetRepository.save(BudgetConfiguration.create(
      family.id,
      category.id,
      Money.of(100_000, "CLP"),
    ));
    const useCase = new CreateBudgetConfigurationUseCase(
      familyRepository,
      new GetCategoriesQuery(categoryRepository),
      budgetRepository,
      new FakeEventBus(),
    );

    await assert.rejects(
      useCase.execute({
        familyId: family.id,
        categoryId: category.id,
        defaultAmount: Money.of(150_000, "CLP"),
      }),
      { name: "DuplicateBudgetConfigurationError" },
    );
  });
});

class InMemoryBudgetConfigurationRepository {
  private readonly budgets: BudgetConfiguration[] = [];

  async save(budget: BudgetConfiguration): Promise<void> {
    const index = this.budgets.findIndex((current) => current.id.equals(budget.id));
    if (index === -1) this.budgets.push(budget);
    else this.budgets[index] = budget;
  }

  async findByFamilyId(familyId: Family["id"]): Promise<BudgetConfiguration[]> {
    return this.budgets.filter((budget) => budget.familyId.equals(familyId));
  }
}