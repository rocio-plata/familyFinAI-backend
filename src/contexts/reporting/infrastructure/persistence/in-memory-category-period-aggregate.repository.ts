// src/contexts/reporting/infrastructure/persistence/in-memory-category-period-aggregate.repository.ts
import type { Period } from "../../../../shared-kernel/domain/period.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { CategoryPeriodAggregate } from "../../domain/entities/category-period-aggregate.js";
import type { CategoryPeriodAggregateRepository } from "../../domain/repositories/category-period-aggregate.repository.js";

class InMemoryCategoryPeriodAggregateRepository implements CategoryPeriodAggregateRepository {
  private readonly aggregates = new Map<string, CategoryPeriodAggregate>();

  async save(aggregate: CategoryPeriodAggregate): Promise<void> {
    this.aggregates.set(
      this.key(aggregate.familyId, aggregate.categoryId, aggregate.period),
      aggregate,
    );
  }

  async findByFamilyIdAndPeriod(
    familyId: FamilyId,
    period: Period,
  ): Promise<CategoryPeriodAggregate[]> {
    return [...this.aggregates.values()].filter(
      (aggregate) => aggregate.familyId.equals(familyId) && aggregate.period.equals(period),
    );
  }

  private key(
    familyId: FamilyId,
    categoryId: CategoryPeriodAggregate["categoryId"],
    period: Period,
  ): string {
    return `${familyId.toString()}:${categoryId.toString()}:${period.toString()}`;
  }
}

export { InMemoryCategoryPeriodAggregateRepository };
