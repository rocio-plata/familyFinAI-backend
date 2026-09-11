// src/contexts/budgeting/domain/repositories/budget-period-status.repository.ts

import type { Period } from "../../../../shared-kernel/domain/period.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import type { BudgetPeriodStatus } from "../entities/budget-period-status.js";

interface BudgetPeriodStatusRepository {
  save(status: BudgetPeriodStatus): Promise<void>;
  findByFamilyIdCategoryIdAndPeriod(
    familyId: FamilyId,
    categoryId: CategoryId,
    period: Period,
  ): Promise<BudgetPeriodStatus | null>;
}

export type { BudgetPeriodStatusRepository };
