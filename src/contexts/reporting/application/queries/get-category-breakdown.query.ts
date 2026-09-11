// src/contexts/reporting/application/queries/get-category-breakdown.query.ts

import type { Period } from "../../../../shared-kernel/domain/period.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type {
  CategoryDTO,
  GetCategoriesQuery,
} from "../../../financial-tracking/application/queries/get-categories.query.js";
import type { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import type { CategoryName } from "../../../financial-tracking/domain/value-objects/category-name.js";
import { FinancialItemType } from "../../../financial-tracking/domain/value-objects/financial-item-type.js";
import type { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import type { CategoryPeriodAggregateRepository } from "../../domain/repositories/category-period-aggregate.repository.js";

interface GetCategoryBreakdownInput {
  familyId: FamilyId;
  period: Period;
  type?: FinancialItemType;
}

interface CategoryBreakdownDTO {
  categoryId: CategoryId;
  categoryName: CategoryName;
  amount: Money;
}

class GetCategoryBreakdownQuery {
  constructor(
    private readonly aggregateRepository: CategoryPeriodAggregateRepository,
    private readonly getCategoriesQuery: GetCategoriesQuery,
  ) {}

  async execute(input: GetCategoryBreakdownInput): Promise<CategoryBreakdownDTO[]> {
    const type = input.type ?? FinancialItemType.Expense;
    const [aggregates, categories] = await Promise.all([
      this.aggregateRepository.findByFamilyIdAndPeriod(input.familyId, input.period),
      this.getCategoriesQuery.execute({ familyId: input.familyId, includeDeprecated: true }),
    ]);
    const categoriesById = new Map(
      categories.map((category) => [category.id.toString(), category]),
    );

    return aggregates
      .map((aggregate) => ({
        category: categoriesById.get(aggregate.categoryId.toString()),
        amount: type === FinancialItemType.Expense ? aggregate.totalExpense : aggregate.totalIncome,
      }))
      .filter(
        (entry): entry is { category: CategoryDTO; amount: Money } =>
          entry.category !== undefined && entry.amount.amount > 0,
      )
      .map(({ category, amount }) => ({
        categoryId: category.id,
        categoryName: category.name,
        amount,
      }))
      .sort((first, second) => second.amount.amount - first.amount.amount);
  }
}

export type { CategoryBreakdownDTO, GetCategoryBreakdownInput };
export { GetCategoryBreakdownQuery };
