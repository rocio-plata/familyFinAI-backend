// src/contexts/reporting/domain/repositories/category-period-aggregate.repository.ts

import type { Period } from "../../../../shared-kernel/domain/period.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { CategoryPeriodAggregate } from "../entities/category-period-aggregate.js";

interface CategoryPeriodAggregateRepository {
  findByFamilyIdAndPeriod(familyId: FamilyId, period: Period): Promise<CategoryPeriodAggregate[]>;
}

export type { CategoryPeriodAggregateRepository };
