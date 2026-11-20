// tests/unit/contexts/reporting/get-dashboard-summary.query.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { GetCategoriesQuery } from "../../../../src/contexts/financial-tracking/application/queries/get-categories.query.js";
import { Category } from "../../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryColor } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-color.js";
import { CategoryIcon } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-icon.js";
import { CategoryId } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { CategoryName } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { FinancialItemType } from "../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { GetDashboardSummaryQuery } from "../../../../src/contexts/reporting/application/queries/get-dashboard-summary.query.js";
import { CategoryPeriodAggregate } from "../../../../src/contexts/reporting/domain/entities/category-period-aggregate.js";
import { Currency } from "../../../../src/shared-kernel/domain/currency.js";
import { Money } from "../../../../src/shared-kernel/domain/money.js";
import { Period } from "../../../../src/shared-kernel/domain/period.js";
import { InMemoryCategoryRepository } from "../financial-tracking/doubles/in-memory-category.repository.js";
import { InMemoryCategoryPeriodAggregateRepository } from "./doubles/in-memory-category-period-aggregate.repository.js";

describe("GetDashboardSummaryQuery", () => {
  let query: GetDashboardSummaryQuery;
  let repository: InMemoryCategoryPeriodAggregateRepository;
  let categoryRepository: InMemoryCategoryRepository;
  let familyId: FamilyId;
  let period: Period;

  const clp = (amount: number) => Money.of(amount, Currency.default());

  const addCategory = (
    type: FinancialItemType,
    name: string,
    options: { icon?: string; color?: string } = {},
  ): Category => {
    const category = Category.create(
      familyId,
      type,
      CategoryName.of(name),
      options.icon ? CategoryIcon.of(options.icon) : undefined,
      options.color ? CategoryColor.of(options.color) : undefined,
    );
    categoryRepository.add(category);
    return category;
  };

  const register = async (categoryId: CategoryId, type: FinancialItemType, amount: number) => {
    const aggregate = CategoryPeriodAggregate.create(
      familyId,
      categoryId,
      period,
      Currency.default(),
    );
    aggregate.registerItem(type, clp(amount));
    await repository.save(aggregate);
  };

  beforeEach(() => {
    repository = new InMemoryCategoryPeriodAggregateRepository();
    categoryRepository = new InMemoryCategoryRepository();
    query = new GetDashboardSummaryQuery(repository, new GetCategoriesQuery(categoryRepository));
    familyId = FamilyId.generate();
    period = Period.of(2026, 8);
  });

  test("devuelve un resumen en cero, con el período y la moneda, si no hay movimientos", async () => {
    const summary = await query.execute({ familyId, period });

    assert.equal(summary.period.toString(), "2026-08");
    assert.equal(summary.currency.toString(), Currency.default().toString());
    assert.equal(summary.totalExpenses.amount, 0);
    assert.equal(summary.totalIncome.amount, 0);
    assert.equal(summary.balance.amount, 0);
    assert.deepEqual(summary.expenseByCategory, []);
    assert.deepEqual(summary.incomeByCategory, []);
  });

  test("acumula gastos, ingresos y saldo (como Money) de todas las categorías del período", async () => {
    const groceries = addCategory(FinancialItemType.Expense, "Supermercado");
    const salary = addCategory(FinancialItemType.Income, "Sueldo");
    await register(groceries.id, FinancialItemType.Expense, 30_000);
    await register(salary.id, FinancialItemType.Income, 700_000);

    const summary = await query.execute({ familyId, period });

    assert.equal(summary.totalExpenses.amount, 30_000);
    assert.equal(summary.totalIncome.amount, 700_000);
    assert.equal(summary.balance.amount, 670_000);
    assert.equal(summary.balance.currency.toString(), Currency.default().toString());
  });

  test("desglosa los gastos por categoría con nombre, ícono, color, estado y porcentaje", async () => {
    const groceries = addCategory(FinancialItemType.Expense, "Supermercado", {
      icon: "shopping_cart",
      color: "teal_500",
    });
    const transport = addCategory(FinancialItemType.Expense, "Transporte");
    await register(groceries.id, FinancialItemType.Expense, 75_000);
    await register(transport.id, FinancialItemType.Expense, 25_000);

    const { expenseByCategory } = await query.execute({ familyId, period });

    assert.deepEqual(
      expenseByCategory.map((entry) => ({
        categoryId: entry.categoryId.toString(),
        name: entry.name.toString(),
        icon: entry.icon?.toString() ?? null,
        color: entry.color?.toString() ?? null,
        status: entry.status,
        amount: entry.amount.amount,
        percentage: entry.percentage,
      })),
      [
        {
          categoryId: groceries.id.toString(),
          name: "Supermercado",
          icon: "shopping_cart",
          color: "teal_500",
          status: "ACTIVE",
          amount: 75_000,
          percentage: 75,
        },
        {
          categoryId: transport.id.toString(),
          name: "Transporte",
          icon: null,
          color: null,
          status: "ACTIVE",
          amount: 25_000,
          percentage: 25,
        },
      ],
    );
  });

  test("desglosa los ingresos por categoría, separados de los gastos", async () => {
    const groceries = addCategory(FinancialItemType.Expense, "Supermercado");
    const salary = addCategory(FinancialItemType.Income, "Sueldo");
    const bonus = addCategory(FinancialItemType.Income, "Bono");
    await register(groceries.id, FinancialItemType.Expense, 50_000);
    await register(salary.id, FinancialItemType.Income, 900_000);
    await register(bonus.id, FinancialItemType.Income, 100_000);

    const { expenseByCategory, incomeByCategory } = await query.execute({ familyId, period });

    assert.deepEqual(
      expenseByCategory.map((entry) => entry.name.toString()),
      ["Supermercado"],
    );
    assert.deepEqual(
      incomeByCategory.map((entry) => [
        entry.name.toString(),
        entry.amount.amount,
        entry.percentage,
      ]),
      [
        ["Sueldo", 900_000, 90],
        ["Bono", 100_000, 10],
      ],
    );
  });

  test("incluye las categorías activas sin movimientos en $0 con 0%", async () => {
    const groceries = addCategory(FinancialItemType.Expense, "Supermercado");
    addCategory(FinancialItemType.Expense, "Salud");
    addCategory(FinancialItemType.Income, "Sueldo");
    await register(groceries.id, FinancialItemType.Expense, 40_000);

    const { expenseByCategory, incomeByCategory } = await query.execute({ familyId, period });

    assert.deepEqual(
      expenseByCategory.map((entry) => [
        entry.name.toString(),
        entry.amount.amount,
        entry.percentage,
      ]),
      [
        ["Supermercado", 40_000, 100],
        ["Salud", 0, 0],
      ],
    );
    assert.deepEqual(
      incomeByCategory.map((entry) => [
        entry.name.toString(),
        entry.amount.amount,
        entry.percentage,
      ]),
      [["Sueldo", 0, 0]],
    );
  });

  test("las categorías sin movimientos usan la moneda del resumen", async () => {
    addCategory(FinancialItemType.Expense, "Salud");

    const { expenseByCategory, currency } = await query.execute({ familyId, period });

    assert.equal(expenseByCategory[0]?.amount.currency.toString(), currency.toString());
  });

  test("incluye una categoría deprecada solo si tiene movimientos en el período", async () => {
    const withMovements = addCategory(FinancialItemType.Expense, "Antigua con gastos");
    const withoutMovements = addCategory(FinancialItemType.Expense, "Antigua sin gastos");
    withMovements.deprecate();
    withoutMovements.deprecate();
    await register(withMovements.id, FinancialItemType.Expense, 10_000);

    const { expenseByCategory } = await query.execute({ familyId, period });

    assert.deepEqual(
      expenseByCategory.map((entry) => [entry.name.toString(), entry.status]),
      [["Antigua con gastos", "DEPRECATED"]],
    );
  });

  test("ordena por monto descendente y, a igualdad, por nombre", async () => {
    const zeta = addCategory(FinancialItemType.Expense, "Zeta");
    const alfa = addCategory(FinancialItemType.Expense, "Alfa");
    const grande = addCategory(FinancialItemType.Expense, "Grande");
    addCategory(FinancialItemType.Expense, "Beta");
    await register(zeta.id, FinancialItemType.Expense, 5_000);
    await register(alfa.id, FinancialItemType.Expense, 5_000);
    await register(grande.id, FinancialItemType.Expense, 90_000);

    const { expenseByCategory } = await query.execute({ familyId, period });

    assert.deepEqual(
      expenseByCategory.map((entry) => entry.name.toString()),
      ["Grande", "Alfa", "Zeta", "Beta"],
    );
  });

  test("los totales cuentan también movimientos de categorías ya eliminadas", async () => {
    const groceries = addCategory(FinancialItemType.Expense, "Supermercado");
    await register(groceries.id, FinancialItemType.Expense, 30_000);
    await register(CategoryId.generate(), FinancialItemType.Expense, 10_000);

    const summary = await query.execute({ familyId, period });

    assert.equal(summary.totalExpenses.amount, 40_000);
    assert.deepEqual(
      summary.expenseByCategory.map((entry) => entry.name.toString()),
      ["Supermercado"],
    );
  });

  test("usa el mes en curso cuando no recibe período", async () => {
    const summary = await query.execute({ familyId });

    assert.equal(summary.period.toString(), Period.current().toString());
  });
});
