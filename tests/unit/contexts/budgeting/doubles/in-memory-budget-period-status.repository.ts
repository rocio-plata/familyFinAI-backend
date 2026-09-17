// tests/contexts/budgeting/doubles/in-memory-budget-period-status.repository.ts

import type { BudgetPeriodStatus } from "../../../../src/contexts/budgeting/domain/entities/budget-period-status.js";
import type { BudgetPeriodStatusRepository } from "../../../../src/contexts/budgeting/domain/repositories/budget-period-status.repository.js";
import type { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import type { CategoryId } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import type { Period } from "../../../../src/shared-kernel/domain/period.js";

class InMemoryBudgetPeriodStatusRepository implements BudgetPeriodStatusRepository {
  private readonly statuses = new Map<string, BudgetPeriodStatus>();

  async save(status: BudgetPeriodStatus): Promise<void> {
    this.statuses.set(this.key(status.familyId, status.categoryId, status.period), status);
  }

  async findByFamilyIdCategoryIdAndPeriod(
    familyId: FamilyId,
    categoryId: CategoryId,
    period: Period,
  ): Promise<BudgetPeriodStatus | null> {
    return this.statuses.get(this.key(familyId, categoryId, period)) ?? null;
  }

  private key(familyId: FamilyId, categoryId: CategoryId, period: Period): string {
    return `${familyId.toString()}:${categoryId.toString()}:${period.toString()}`;
  }
}

export { InMemoryBudgetPeriodStatusRepository };
