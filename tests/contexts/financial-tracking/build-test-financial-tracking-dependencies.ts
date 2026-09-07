// tests/contexts/financial-tracking/build-test-financial-tracking-dependencies.ts
import type { FinancialTrackingModuleDependencies } from "../../../src/contexts/financial-tracking/financial-tracking.module.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";
import { InMemoryCategoryRepository } from "./doubles/in-memory-category.repository.js";

function buildTestFinancialTrackingDependencies(
  overrides: Partial<FinancialTrackingModuleDependencies> = {},
): FinancialTrackingModuleDependencies {
  return {
    categoryRepository: overrides.categoryRepository ?? new InMemoryCategoryRepository(),
    eventBus: overrides.eventBus ?? new FakeEventBus(),
  };
}

export { buildTestFinancialTrackingDependencies };
