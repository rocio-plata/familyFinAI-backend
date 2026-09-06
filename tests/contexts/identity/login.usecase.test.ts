// tests/contexts/identity/login.usecase.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { EmailAddress } from "../../../src/contexts/family-access/domain/value-objects/email-address.js";
import { LoginUseCase } from "../../../src/contexts/identity/application/commands/login.usecase.js";
import { User } from "../../../src/contexts/identity/domain/entities/user.js";
import { InvalidCredentialsError } from "../../../src/contexts/identity/domain/errors/invalid-credentials.error.js";
import { DisplayName } from "../../../src/contexts/identity/domain/value-objects/display-name.js";
import { PasswordHash } from "../../../src/contexts/identity/domain/value-objects/password-hash.js";
import { TokenService } from "../../../src/platform/auth/tokens.js";
import { FakeJwtService } from "../../platform/auth/doubles/fake-jwt-service.js";
import { InMemoryRefreshTokenRepository } from "../../platform/auth/doubles/in-memory-refresh-token.repository.js";
import { InMemoryUserRepository } from "./doubles/in-memory-user.repository.js";

// simula la verificación real: solo "supersecreta" coincide con el hash almacenado "hashed:supersecreta"
const fakeVerify = (plainText: string, storedHash: string) => storedHash === `hashed:${plainText}`;

describe("LoginUseCase", () => {
  let userRepository: InMemoryUserRepository;
  let tokenService: TokenService;
  let useCase: LoginUseCase;

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    tokenService = new TokenService(new FakeJwtService(), new InMemoryRefreshTokenRepository());
    useCase = new LoginUseCase(userRepository, tokenService, fakeVerify);

    const user = User.register(
      EmailAddress.of("rocio@test.com"),
      PasswordHash.fromStoredHash("hashed:supersecreta"),
      DisplayName.of("Rocío"),
    );
    user.pullDomainEvents();
    await userRepository.save(user);
  });

  test("inicia sesión con credenciales correctas", async () => {
    const { user } = await useCase.execute({ email: "rocio@test.com", password: "supersecreta" });

    assert.equal(user.email.toString(), "rocio@test.com");
  });

  test("emite un nuevo par de tokens", async () => {
    const { tokens } = await useCase.execute({ email: "rocio@test.com", password: "supersecreta" });

    assert.ok(tokens.accessToken.length > 0);
    assert.ok(tokens.refreshToken.length > 0);
  });

  test("rechaza si el email no existe", async () => {
    await assert.rejects(
      () => useCase.execute({ email: "otro@test.com", password: "supersecreta" }),
      InvalidCredentialsError,
    );
  });

  test("rechaza si la contraseña es incorrecta", async () => {
    await assert.rejects(
      () => useCase.execute({ email: "rocio@test.com", password: "incorrecta" }),
      InvalidCredentialsError,
    );
  });
});
