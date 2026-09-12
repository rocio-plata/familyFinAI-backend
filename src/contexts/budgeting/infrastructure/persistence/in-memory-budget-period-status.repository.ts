// src/contexts/budgeting/infrastructure/persistence/in-memory-budget-period-status.repository.ts
import type { Period } from "../../../../shared-kernel/domain/period.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import type { BudgetPeriodStatus } from "../../domain/entities/budget-period-status.js";
import type { BudgetPeriodStatusRepository } from "../../domain/repositories/budget-period-status.repository.js";

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
