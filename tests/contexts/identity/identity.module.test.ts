// tests/contexts/identity/identity.module.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildIdentityModule } from "../../../src/contexts/identity/identity.module.js";
import {
  hashPassword,
  verifyPassword,
} from "../../../src/contexts/identity/infrastructure/password-hasher.js";
import { TokenService } from "../../../src/platform/auth/tokens.js";
import { FakeJwtService } from "../../platform/auth/doubles/fake-jwt-service.js";
import { InMemoryRefreshTokenRepository } from "../../platform/auth/doubles/in-memory-refresh-token.repository.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";
import { InMemoryUserRepository } from "./doubles/in-memory-user.repository.js";

function buildModule() {
  return buildIdentityModule({
    userRepository: new InMemoryUserRepository(),
    tokenService: new TokenService(new FakeJwtService(), new InMemoryRefreshTokenRepository()),
    eventBus: new FakeEventBus(),
    hashPassword,
    verifyPassword,
  });
}

describe("buildIdentityModule", () => {
  test("expone los casos de uso construidos, listos para usar desde otros módulos", () => {
    const module = buildModule();

    assert.ok(module.useCases.registerUser);
    assert.ok(module.useCases.login);
    assert.ok(module.useCases.changePassword);
    assert.ok(module.useCases.getUserProfile);
    assert.ok(module.useCases.getUserIdByEmail); // el que necesita IdentityUserDirectoryAdapter
  });

  test("los casos de uso quedan operativos end-to-end (registro seguido de login)", async () => {
    const module = buildModule();

    const { user } = await module.useCases.registerUser.execute({
      email: "rocio@test.com",
      password: "supersecreta",
      displayName: "Rocío",
    });

    const { tokens } = await module.useCases.login.execute({
      email: "rocio@test.com",
      password: "supersecreta",
    });

    assert.ok(tokens.accessToken.length > 0);

    const profile = await module.useCases.getUserProfile.execute({ userId: user.id });
    assert.equal(profile.email, "rocio@test.com");

    const foundUserId = await module.useCases.getUserIdByEmail.execute({
      email: user.email,
    });
    assert.ok(foundUserId?.equals(user.id));
  });
});
