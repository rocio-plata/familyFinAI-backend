// tests/unit/contexts/financial-tracking/build-test-financial-tracking-dependencies.ts
import type { FinancialTrackingModuleDependencies } from "../../../../src/contexts/financial-tracking/financial-tracking.module.js";
import { InMemoryPaymentMethodRepository } from "../../../../src/contexts/financial-tracking/infrastructure/persistence/in-memory-payment-method.repository.js";
import { InMemoryUserPaymentMethodPreferenceRepository } from "../../../../src/contexts/financial-tracking/infrastructure/persistence/in-memory-user-payment-method-preference.repository.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";
import { InMemoryCategoryRepository } from "./doubles/in-memory-category.repository.js";
import { InMemoryFinancialItemRepository } from "./doubles/in-memory-financial-item.repository.js";

function buildTestFinancialTrackingDependencies(
  overrides: Partial<FinancialTrackingModuleDependencies> = {},
): FinancialTrackingModuleDependencies {
  return {
    categoryRepository: overrides.categoryRepository ?? new InMemoryCategoryRepository(),
    financialItemRepository:
      overrides.financialItemRepository ?? new InMemoryFinancialItemRepository(),
    paymentMethodRepository:
      overrides.paymentMethodRepository ?? new InMemoryPaymentMethodRepository(),
    preferenceRepository:
      overrides.preferenceRepository ?? new InMemoryUserPaymentMethodPreferenceRepository(),
    eventBus: overrides.eventBus ?? new FakeEventBus(),
  };
}

export { buildTestFinancialTrackingDependencies };
