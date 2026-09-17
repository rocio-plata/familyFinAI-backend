// tests/contexts/identity/register-user.usecase.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { RegisterUserUseCase } from "../../../src/contexts/identity/application/commands/register-user.usecase.js";
import { EmailAlreadyRegisteredError } from "../../../src/contexts/identity/domain/errors/email-already-registered.error.js";
import { InvalidDisplayNameError } from "../../../src/contexts/identity/domain/errors/invalid-display-name.error.js";
import { WeakPasswordError } from "../../../src/contexts/identity/domain/errors/weak-password.error.js";
import { UserRegistered } from "../../../src/contexts/identity/domain/events/user-registered.event.js";
import { TokenService } from "../../../src/platform/auth/tokens.js";
import { FakeJwtService } from "../../platform/auth/doubles/fake-jwt-service.js";
import { InMemoryRefreshTokenRepository } from "../../platform/auth/doubles/in-memory-refresh-token.repository.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";
import { InMemoryUserRepository } from "./doubles/in-memory-user.repository.js";

// hash determinístico — suficiente para verificar que el use case delega en la función recibida
const fakeHash = (plainText: string) => `hashed:${plainText}`;

describe("RegisterUserUseCase", () => {
  let userRepository: InMemoryUserRepository;
  let tokenService: TokenService;
  let eventBus: FakeEventBus;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    tokenService = new TokenService(new FakeJwtService(), new InMemoryRefreshTokenRepository());
    eventBus = new FakeEventBus();
    useCase = new RegisterUserUseCase(userRepository, tokenService, eventBus, fakeHash);
  });

  test("registra un usuario nuevo con su email y nombre a mostrar", async () => {
    const { user } = await useCase.execute({
      email: "rocio@test.com",
      password: "supersecreta",
      displayName: "Rocío",
    });

    assert.equal(user.email.toString(), "rocio@test.com");
    assert.equal(user.displayName.toString(), "Rocío");
  });

  test("persiste el usuario con la contraseña hasheada usando la función recibida", async () => {
    const { user } = await useCase.execute({
      email: "rocio@test.com",
      password: "supersecreta",
      displayName: "Rocío",
    });

    const persisted = await userRepository.findById(user.id);
    assert.ok(
      persisted?.verifyPassword(
        "cualquier-texto",
        (_plainText, storedHash) => storedHash === "hashed:supersecreta",
      ),
    );
  });

  test("emite un par de tokens de acceso", async () => {
    const { tokens } = await useCase.execute({
      email: "rocio@test.com",
      password: "supersecreta",
      displayName: "Rocío",
    });

    assert.ok(tokens.accessToken.length > 0);
    assert.ok(tokens.refreshToken.length > 0);
  });

  test("publica el evento UserRegistered", async () => {
    await useCase.execute({
      email: "rocio@test.com",
      password: "supersecreta",
      displayName: "Rocío",
    });

    assert.equal(eventBus.publishedEvents.length, 1);
    assert.ok(eventBus.publishedEvents[0] instanceof UserRegistered);
  });

  test("rechaza un email ya registrado", async () => {
    await useCase.execute({
      email: "rocio@test.com",
      password: "supersecreta",
      displayName: "Rocío",
    });

    await assert.rejects(
      () =>
        useCase.execute({
          email: "rocio@test.com",
          password: "otra-contraseña",
          displayName: "Otro nombre",
        }),
      EmailAlreadyRegisteredError,
    );
  });

  test("rechaza una contraseña débil", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          email: "rocio@test.com",
          password: "corta",
          displayName: "Rocío",
        }),
      WeakPasswordError,
    );
  });

  test("rechaza un nombre a mostrar vacío", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          email: "rocio@test.com",
          password: "supersecreta",
          displayName: "   ",
        }),
      InvalidDisplayNameError,
    );
  });
});
