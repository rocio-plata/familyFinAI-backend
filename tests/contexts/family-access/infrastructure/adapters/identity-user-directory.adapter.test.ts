// tests/contexts/family-access/infrastructure/adapters/identity-user-directory.adapter.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { IdentityUserDirectoryAdapter } from "../../../../../src/contexts/family-access/infrastructure/adapters/identity-user-directory.adapter.js";
import { GetUserIdByEmailQuery } from "../../../../../src/contexts/identity/application/queries/get-user-id-by-email.query.js";
import { User } from "../../../../../src/contexts/identity/domain/entities/user.js";
import { DisplayName } from "../../../../../src/contexts/identity/domain/value-objects/display-name.js";
import { PasswordHash } from "../../../../../src/contexts/identity/domain/value-objects/password-hash.js";
import { EmailAddress } from "../../../../../src/shared-kernel/domain/email-address.js";
import { InMemoryUserRepository } from "../../../identity/doubles/in-memory-user.repository.js";

describe("IdentityUserDirectoryAdapter", () => {
  let userRepository: InMemoryUserRepository;
  let adapter: IdentityUserDirectoryAdapter;
  let user: User;

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    adapter = new IdentityUserDirectoryAdapter(new GetUserIdByEmailQuery(userRepository));

    user = User.register(
      EmailAddress.of("rocio@test.com"),
      PasswordHash.fromStoredHash("hashed:supersecreta"),
      DisplayName.of("Rocío"),
    );
    user.pullDomainEvents();
    await userRepository.save(user);
  });

  test("devuelve el userId cuando el email está registrado", async () => {
    const userId = await adapter.findUserIdByEmail(EmailAddress.of("rocio@test.com"));

    assert.ok(userId?.equals(user.id));
  });

  test("devuelve null cuando el email no está registrado", async () => {
    const userId = await adapter.findUserIdByEmail(EmailAddress.of("otro@test.com"));

    assert.equal(userId, null);
  });
});
