// tests/contexts/reporting/doubles/in-memory-category-period-aggregate.repository.ts
import type { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import type { CategoryPeriodAggregate } from "../../../../src/contexts/reporting/domain/entities/category-period-aggregate.js";
import type { CategoryPeriodAggregateRepository } from "../../../../src/contexts/reporting/domain/repositories/category-period-aggregate.repository.js";
import type { Period } from "../../../../src/shared-kernel/domain/period.js";

class InMemoryCategoryPeriodAggregateRepository implements CategoryPeriodAggregateRepository {
  private readonly aggregates: CategoryPeriodAggregate[] = [];

  async save(aggregate: CategoryPeriodAggregate): Promise<void> {
    this.aggregates.push(aggregate);
  }

  async findByFamilyIdAndPeriod(
    familyId: FamilyId,
    period: Period,
  ): Promise<CategoryPeriodAggregate[]> {
    return this.aggregates.filter(
      (aggregate) =>
        aggregate.familyId.toString() === familyId.toString() && aggregate.period.equals(period),
    );
  }
}

export { InMemoryCategoryPeriodAggregateRepository };
