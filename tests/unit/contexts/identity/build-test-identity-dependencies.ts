// tests/contexts/identity/build-test-identity-dependencies.ts
import type { IdentityModuleDependencies } from "../../../src/contexts/identity/identity.module.js";
import {
  hashPassword,
  verifyPassword,
} from "../../../src/contexts/identity/infrastructure/password-hasher.js";
import { TokenService } from "../../../src/platform/auth/tokens.js";
import { FakeJwtService } from "../../platform/auth/doubles/fake-jwt-service.js";
import { InMemoryRefreshTokenRepository } from "../../platform/auth/doubles/in-memory-refresh-token.repository.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";
import { InMemoryUserRepository } from "./doubles/in-memory-user.repository.js";

// dependencias in-memory por defecto para tests que solo necesitan que buildApp() no falle,
// sin ejercitar realmente ningún flujo de Identity
function buildTestIdentityDependencies(): IdentityModuleDependencies {
  return {
    userRepository: new InMemoryUserRepository(),
    tokenService: new TokenService(new FakeJwtService(), new InMemoryRefreshTokenRepository()),
    eventBus: new FakeEventBus(),
    hashPassword,
    verifyPassword,
  };
}

export { buildTestIdentityDependencies };
