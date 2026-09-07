// /src/platform/server.ts
import { IdentityUserDirectoryAdapter } from "../contexts/family-access/infrastructure/adapters/identity-user-directory.adapter.js";
import { InMemoryFamilyRepository } from "../contexts/family-access/infrastructure/persistence/in-memory-family.repository.js";
import { InMemoryInvitationRepository } from "../contexts/family-access/infrastructure/persistence/in-memory-invitation.repository.js";
import { InMemoryCategoryRepository } from "../contexts/financial-tracking/infrastructure/persistence/in-memory-category.repository.js";
import { InMemoryFinancialItemRepository } from "../contexts/financial-tracking/infrastructure/persistence/in-memory-financial-item.repository.js";
import { GetUserIdByEmailQuery } from "../contexts/identity/application/queries/get-user-id-by-email.query.js";
import {
  hashPassword,
  verifyPassword,
} from "../contexts/identity/infrastructure/password-hasher.js";
import { InMemoryUserRepository } from "../contexts/identity/infrastructure/persistence/in-memory-user.repository.js";
import { buildApp } from "./app.js";
import { JwtService } from "./auth/jwt.js";
import { InMemoryRefreshTokenRepository } from "./auth/persistence/in-memory-refresh-token.repository.js";
import { TokenService } from "./auth/tokens.js";
import { InProcessEventBus } from "./events/in-process-event-bus.js";

// (a medida que conectemos Drizzle/Postgres, el InMemoryFamilyRepository se reemplaza por el adaptador real)

const jwtSecret = process.env.JWT_SECRET ?? "dev-only-insecure-secret";
// default "info"; en local exporta LOG_LEVEL=debug para ver, por ej., el token que llega en authenticate
const logLevel = process.env.LOG_LEVEL ?? "info";

const jwtService = new JwtService(new TextEncoder().encode(jwtSecret));
const userRepository = new InMemoryUserRepository();
const getUserIdByEmailQuery = new GetUserIdByEmailQuery(userRepository);
const eventBus = new InProcessEventBus();

const app = buildApp({
  jwtService,
  logLevel,
  familyAccess: {
    familyRepository: new InMemoryFamilyRepository(),
    invitationRepository: new InMemoryInvitationRepository(),
    userDirectory: new IdentityUserDirectoryAdapter(getUserIdByEmailQuery),
    eventBus,
  },
  identity: {
    userRepository,
    tokenService: new TokenService(jwtService, new InMemoryRefreshTokenRepository()),
    eventBus,
    hashPassword,
    verifyPassword,
  },
  financialTracking: {
    categoryRepository: new InMemoryCategoryRepository(),
    financialItemRepository: new InMemoryFinancialItemRepository(),
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
