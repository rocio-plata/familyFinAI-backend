// tests/e2e/build-e2e-app.ts

import { DrizzleBudgetConfigurationRepository } from "../../src/contexts/budgeting/infrastructure/persistence/drizzle-budget-configuration.repository.js";
import { DrizzleBudgetPeriodStatusRepository } from "../../src/contexts/budgeting/infrastructure/persistence/drizzle-budget-period-status.repository.js";
import { IdentityUserDirectoryAdapter } from "../../src/contexts/family-access/infrastructure/adapters/identity-user-directory.adapter.js";
import { DrizzleFamilyRepository } from "../../src/contexts/family-access/infrastructure/persistence/drizzle-family.repository.js";
import { DrizzleInvitationRepository } from "../../src/contexts/family-access/infrastructure/persistence/drizzle-invitation.repository.js";
import { GetCategoriesQuery } from "../../src/contexts/financial-tracking/application/queries/get-categories.query.js";
import { GetFinancialItemsQuery } from "../../src/contexts/financial-tracking/application/queries/get-financial-items.query.js";
import { GetPaymentMethodsQuery } from "../../src/contexts/financial-tracking/application/queries/get-payment-methods.query.js";
import { DrizzleCategoryRepository } from "../../src/contexts/financial-tracking/infrastructure/persistence/drizzle-category.repository.js";
import { DrizzleFinancialItemRepository } from "../../src/contexts/financial-tracking/infrastructure/persistence/drizzle-financial-item.repository.js";
import { DrizzlePaymentMethodRepository } from "../../src/contexts/financial-tracking/infrastructure/persistence/drizzle-payment-method.repository.js";
import { DrizzleUserPaymentMethodPreferenceRepository } from "../../src/contexts/financial-tracking/infrastructure/persistence/drizzle-user-payment-method-preference.repository.js";
import { GetUserIdByEmailQuery } from "../../src/contexts/identity/application/queries/get-user-id-by-email.query.js";
import {
  hashPassword,
  verifyPassword,
} from "../../src/contexts/identity/infrastructure/password-hasher.js";
import { DrizzleUserRepository } from "../../src/contexts/identity/infrastructure/persistence/drizzle-user.repository.js";
import { DrizzleCategoryPeriodAggregateRepository } from "../../src/contexts/reporting/infrastructure/persistence/drizzle-category-period-aggregate.repository.js";
import { DrizzlePaymentMethodPeriodAggregateRepository } from "../../src/contexts/reporting/infrastructure/persistence/drizzle-payment-method-period-aggregate.repository.js";
import { buildApp } from "../../src/platform/app.js";
import { JwtService } from "../../src/platform/auth/jwt.js";
import { DrizzleRefreshTokenRepository } from "../../src/platform/auth/persistence/drizzle-refresh-token.repository.js";
import { TokenService } from "../../src/platform/auth/tokens.js";
import { DrizzleUnitOfWork } from "../../src/platform/db/unit-of-work.js";
import { InProcessEventBus } from "../../src/platform/events/in-process-event-bus.js";

// composición real (Drizzle + Postgres) reutilizada por todos los tests e2e — mismo patrón
// que src/platform/server.ts, pero sin abrir un puerto real (se usa app.inject()).
function buildE2eApp() {
  const eventBus = new InProcessEventBus();
  const userRepository = new DrizzleUserRepository();
  const familyRepository = new DrizzleFamilyRepository();
  const categoryRepository = new DrizzleCategoryRepository();
  const financialItemRepository = new DrizzleFinancialItemRepository();
  const paymentMethodRepository = new DrizzlePaymentMethodRepository();
  const preferenceRepository = new DrizzleUserPaymentMethodPreferenceRepository();
  const categoryPeriodAggregateRepository = new DrizzleCategoryPeriodAggregateRepository();
  const paymentMethodPeriodAggregateRepository =
    new DrizzlePaymentMethodPeriodAggregateRepository();

  return buildApp({
    jwtService: new JwtService(new TextEncoder().encode("e2e-test-secret")),
    logLevel: "silent",
    familyAccess: {
      familyRepository,
      invitationRepository: new DrizzleInvitationRepository(),
      userDirectory: new IdentityUserDirectoryAdapter(new GetUserIdByEmailQuery(userRepository)),
      eventBus,
      unitOfWork: new DrizzleUnitOfWork(),
    },
    identity: {
      userRepository,
      tokenService: new TokenService(
        new JwtService(new TextEncoder().encode("e2e-test-secret")),
        new DrizzleRefreshTokenRepository(),
      ),
      eventBus,
      hashPassword,
      verifyPassword,
    },
    financialTracking: {
      categoryRepository,
      financialItemRepository,
      paymentMethodRepository,
      preferenceRepository,
      eventBus,
    },
    reporting: {
      aggregateRepository: categoryPeriodAggregateRepository,
      paymentMethodAggregateRepository: paymentMethodPeriodAggregateRepository,
      getPaymentMethodsQuery: new GetPaymentMethodsQuery(paymentMethodRepository),
      getCategoriesQuery: new GetCategoriesQuery(categoryRepository),
      getFinancialItemsQuery: new GetFinancialItemsQuery(financialItemRepository),
      eventBus,
    },
    budgeting: {
      familyRepository,
      budgetConfigurationRepository: new DrizzleBudgetConfigurationRepository(),
      budgetPeriodStatusRepository: new DrizzleBudgetPeriodStatusRepository(),
      getCategoriesQuery: new GetCategoriesQuery(categoryRepository),
      eventBus,
    },
  });
}

export { buildE2eApp };
