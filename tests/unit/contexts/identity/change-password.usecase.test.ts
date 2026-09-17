// tests/contexts/identity/change-password.usecase.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { ChangePasswordUseCase } from "../../../src/contexts/identity/application/commands/change-password.usecase.js";
import { User } from "../../../src/contexts/identity/domain/entities/user.js";
import { InvalidCredentialsError } from "../../../src/contexts/identity/domain/errors/invalid-credentials.error.js";
import { UserNotFoundError } from "../../../src/contexts/identity/domain/errors/user-not-found.error.js";
import { WeakPasswordError } from "../../../src/contexts/identity/domain/errors/weak-password.error.js";
import { DisplayName } from "../../../src/contexts/identity/domain/value-objects/display-name.js";
import { PasswordHash } from "../../../src/contexts/identity/domain/value-objects/password-hash.js";
import { EmailAddress } from "../../../src/shared-kernel/domain/email-address.js";
import { InMemoryUserRepository } from "./doubles/in-memory-user.repository.js";

// hash/verify determinísticos: "hashed:<texto>" — suficiente para probar que el use case delega en las funciones recibidas
const fakeHash = (plainText: string) => `hashed:${plainText}`;
const fakeVerify = (plainText: string, storedHash: string) => storedHash === `hashed:${plainText}`;

describe("ChangePasswordUseCase", () => {
  let userRepository: InMemoryUserRepository;
  let useCase: ChangePasswordUseCase;
  let user: User;

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    useCase = new ChangePasswordUseCase(userRepository, fakeHash, fakeVerify);

    user = User.register(
      EmailAddress.of("rocio@test.com"),
      PasswordHash.fromStoredHash("hashed:supersecreta"),
      DisplayName.of("Rocío"),
    );
    user.pullDomainEvents();
    await userRepository.save(user);
  });

  test("cambia la contraseña cuando la actual es correcta", async () => {
    await useCase.execute({
      userId: user.id,
      currentPassword: "supersecreta",
      newPassword: "nuevacontraseña",
    });

    const persisted = await userRepository.findById(user.id);
    assert.ok(persisted?.verifyPassword("nuevacontraseña", fakeVerify));
  });

  test("rechaza si el usuario no existe", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          userId: UserId.generate(),
          currentPassword: "supersecreta",
          newPassword: "nuevacontraseña",
        }),
      UserNotFoundError,
    );
  });

  test("rechaza si la contraseña actual es incorrecta", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          userId: user.id,
          currentPassword: "incorrecta",
          newPassword: "nuevacontraseña",
        }),
      InvalidCredentialsError,
    );
  });

  test("rechaza una nueva contraseña débil", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          userId: user.id,
          currentPassword: "supersecreta",
          newPassword: "corta",
        }),
      WeakPasswordError,
    );
  });

  test("no persiste cambios si la nueva contraseña es débil", async () => {
    await assert.rejects(() =>
      useCase.execute({
        userId: user.id,
        currentPassword: "supersecreta",
        newPassword: "corta",
      }),
    );

    const persisted = await userRepository.findById(user.id);
    assert.ok(persisted?.verifyPassword("supersecreta", fakeVerify));
  });
});
