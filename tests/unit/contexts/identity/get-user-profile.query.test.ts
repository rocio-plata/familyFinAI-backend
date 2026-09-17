// tests/contexts/identity/get-user-profile.query.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { GetUserProfileQuery } from "../../../src/contexts/identity/application/queries/get-user-profile.query.js";
import { User } from "../../../src/contexts/identity/domain/entities/user.js";
import { UserNotFoundError } from "../../../src/contexts/identity/domain/errors/user-not-found.error.js";
import { DisplayName } from "../../../src/contexts/identity/domain/value-objects/display-name.js";
import { PasswordHash } from "../../../src/contexts/identity/domain/value-objects/password-hash.js";
import { EmailAddress } from "../../../src/shared-kernel/domain/email-address.js";
import { InMemoryUserRepository } from "./doubles/in-memory-user.repository.js";

describe("GetUserProfileQuery", () => {
  let userRepository: InMemoryUserRepository;
  let query: GetUserProfileQuery;
  let user: User;

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    query = new GetUserProfileQuery(userRepository);

    user = User.register(
      EmailAddress.of("rocio@test.com"),
      PasswordHash.fromStoredHash("hashed:supersecreta"),
      DisplayName.of("Rocío"),
    );
    user.pullDomainEvents();
    await userRepository.save(user);
  });

  test("devuelve el email, nombre a mostrar y fecha de creación", async () => {
    const profile = await query.execute({ userId: user.id });

    assert.equal(profile.email, "rocio@test.com");
    assert.equal(profile.displayName, "Rocío");
    assert.ok(profile.createdAt instanceof Date);
  });

  test("rechaza si el usuario no existe", async () => {
    await assert.rejects(() => query.execute({ userId: UserId.generate() }), UserNotFoundError);
  });
});
