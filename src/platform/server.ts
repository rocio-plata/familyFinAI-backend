// /src/platform/server.ts

import { DrizzleBudgetConfigurationRepository } from "../contexts/budgeting/infrastructure/persistence/drizzle-budget-configuration.repository.js";
import { DrizzleBudgetPeriodStatusRepository } from "../contexts/budgeting/infrastructure/persistence/drizzle-budget-period-status.repository.js";
import { InMemoryBudgetConfigurationRepository } from "../contexts/budgeting/infrastructure/persistence/in-memory-budget-configuration.repository.js";
import { InMemoryBudgetPeriodStatusRepository } from "../contexts/budgeting/infrastructure/persistence/in-memory-budget-period-status.repository.js";
import { IdentityUserDirectoryAdapter } from "../contexts/family-access/infrastructure/adapters/identity-user-directory.adapter.js";
import { DrizzleFamilyRepository } from "../contexts/family-access/infrastructure/persistence/drizzle-family.repository.js";
import { DrizzleInvitationRepository } from "../contexts/family-access/infrastructure/persistence/drizzle-invitation.repository.js";
import { InMemoryFamilyRepository } from "../contexts/family-access/infrastructure/persistence/in-memory-family.repository.js";
import { InMemoryInvitationRepository } from "../contexts/family-access/infrastructure/persistence/in-memory-invitation.repository.js";
import { GetCategoriesQuery } from "../contexts/financial-tracking/application/queries/get-categories.query.js";
import { GetFinancialItemsQuery } from "../contexts/financial-tracking/application/queries/get-financial-items.query.js";
import { DrizzleCategoryRepository } from "../contexts/financial-tracking/infrastructure/persistence/drizzle-category.repository.js";
import { DrizzleFinancialItemRepository } from "../contexts/financial-tracking/infrastructure/persistence/drizzle-financial-item.repository.js";
import { InMemoryCategoryRepository } from "../contexts/financial-tracking/infrastructure/persistence/in-memory-category.repository.js";
import { InMemoryFinancialItemRepository } from "../contexts/financial-tracking/infrastructure/persistence/in-memory-financial-item.repository.js";
import { GetUserIdByEmailQuery } from "../contexts/identity/application/queries/get-user-id-by-email.query.js";
import {
  hashPassword,
  verifyPassword,
} from "../contexts/identity/infrastructure/password-hasher.js";
import { DrizzleUserRepository } from "../contexts/identity/infrastructure/persistence/drizzle-user.repository.js";
import { InMemoryUserRepository } from "../contexts/identity/infrastructure/persistence/in-memory-user.repository.js";
import { DrizzleCategoryPeriodAggregateRepository } from "../contexts/reporting/infrastructure/persistence/drizzle-category-period-aggregate.repository.js";
import { InMemoryCategoryPeriodAggregateRepository } from "../contexts/reporting/infrastructure/persistence/in-memory-category-period-aggregate.repository.js";
import { buildApp } from "./app.js";
import { JwtService } from "./auth/jwt.js";
import { DrizzleRefreshTokenRepository } from "./auth/persistence/drizzle-refresh-token.repository.js";
import { InMemoryRefreshTokenRepository } from "./auth/persistence/in-memory-refresh-token.repository.js";
import { TokenService } from "./auth/tokens.js";
import { DirectUnitOfWork, DrizzleUnitOfWork } from "./db/unit-of-work.js";
import { InProcessEventBus } from "./events/in-process-event-bus.js";

const persistenceMode = process.env.PERSISTENCE_MODE ?? "memory";
if (persistenceMode !== "memory" && persistenceMode !== "postgres") {
  throw new Error('PERSISTENCE_MODE debe ser "memory" o "postgres"');
}

const usePostgres = persistenceMode === "postgres";
if (usePostgres && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL es obligatoria cuando PERSISTENCE_MODE=postgres");
}

const jwtSecret = process.env.JWT_SECRET ?? "dev-only-insecure-secret";
// default "info"; en local exporta LOG_LEVEL=debug para ver, por ej., el token que llega en authenticate
const logLevel = process.env.LOG_LEVEL ?? "info";

const jwtService = new JwtService(new TextEncoder().encode(jwtSecret));
const userRepository = usePostgres ? new DrizzleUserRepository() : new InMemoryUserRepository();
const getUserIdByEmailQuery = new GetUserIdByEmailQuery(userRepository);
const eventBus = new InProcessEventBus();
const familyRepository = usePostgres
  ? new DrizzleFamilyRepository()
  : new InMemoryFamilyRepository();
const invitationRepository = usePostgres
  ? new DrizzleInvitationRepository()
  : new InMemoryInvitationRepository();
const categoryRepository = usePostgres
  ? new DrizzleCategoryRepository()
  : new InMemoryCategoryRepository();
const financialItemRepository = usePostgres
  ? new DrizzleFinancialItemRepository()
  : new InMemoryFinancialItemRepository();
const categoryPeriodAggregateRepository = usePostgres
  ? new DrizzleCategoryPeriodAggregateRepository()
  : new InMemoryCategoryPeriodAggregateRepository();
const budgetConfigurationRepository = usePostgres
  ? new DrizzleBudgetConfigurationRepository()
  : new InMemoryBudgetConfigurationRepository();
const budgetPeriodStatusRepository = usePostgres
  ? new DrizzleBudgetPeriodStatusRepository()
  : new InMemoryBudgetPeriodStatusRepository();
const refreshTokenRepository = usePostgres
  ? new DrizzleRefreshTokenRepository()
  : new InMemoryRefreshTokenRepository();
const unitOfWork = usePostgres ? new DrizzleUnitOfWork() : new DirectUnitOfWork();

const app = buildApp({
  jwtService,
  logLevel,
  familyAccess: {
    familyRepository,
    invitationRepository,
    userDirectory: new IdentityUserDirectoryAdapter(getUserIdByEmailQuery),
    eventBus,
    unitOfWork,
  },
  identity: {
    userRepository,
    tokenService: new TokenService(jwtService, refreshTokenRepository),
    eventBus,
    hashPassword,
    verifyPassword,
  },
  financialTracking: {
    categoryRepository,
    financialItemRepository,
    eventBus,
  },
  reporting: {
    aggregateRepository: categoryPeriodAggregateRepository,
    getCategoriesQuery: new GetCategoriesQuery(categoryRepository),
    getFinancialItemsQuery: new GetFinancialItemsQuery(financialItemRepository),
    eventBus,
  },
  budgeting: {
    familyRepository,
    budgetConfigurationRepository,
    budgetPeriodStatusRepository,
    getCategoriesQuery: new GetCategoriesQuery(categoryRepository),
    eventBus,
  },
});

const start = async () => {
  try {
    await app.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
