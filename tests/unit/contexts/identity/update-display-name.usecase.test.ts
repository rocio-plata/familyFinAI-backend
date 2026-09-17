// tests/contexts/identity/update-display-name.usecase.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { UpdateDisplayNameUseCase } from "../../../src/contexts/identity/application/commands/update-display-name.usecase.js";
import { User } from "../../../src/contexts/identity/domain/entities/user.js";
import { UserNotFoundError } from "../../../src/contexts/identity/domain/errors/user-not-found.error.js";
import { DisplayName } from "../../../src/contexts/identity/domain/value-objects/display-name.js";
import { PasswordHash } from "../../../src/contexts/identity/domain/value-objects/password-hash.js";
import { EmailAddress } from "../../../src/shared-kernel/domain/email-address.js";
import { InMemoryUserRepository } from "./doubles/in-memory-user.repository.js";

describe("UpdateDisplayNameUseCase", () => {
  let userRepository: InMemoryUserRepository;
  let useCase: UpdateDisplayNameUseCase;
  let user: User;

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    useCase = new UpdateDisplayNameUseCase(userRepository);
    user = User.register(
      EmailAddress.of("rocio@test.com"),
      PasswordHash.fromStoredHash("hashed:supersecreta"),
      DisplayName.of("Rocío"),
    );
    user.pullDomainEvents();
    await userRepository.save(user);
  });

  test("actualiza y persiste el nombre para mostrar", async () => {
    await useCase.execute({ userId: user.id, displayName: "Rocío Plaza" });

    const persisted = await userRepository.findById(user.id);
    assert.equal(persisted?.displayName.toString(), "Rocío Plaza");
  });

  test("normaliza los espacios del nombre para mostrar", async () => {
    await useCase.execute({ userId: user.id, displayName: "  Rocío Plaza  " });

    const persisted = await userRepository.findById(user.id);
    assert.equal(persisted?.displayName.toString(), "Rocío Plaza");
  });

  test("rechaza si el usuario no existe", async () => {
    await assert.rejects(
      () => useCase.execute({ userId: UserId.generate(), displayName: "Rocío Plaza" }),
      UserNotFoundError,
    );
  });
});
