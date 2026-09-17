// tests/contexts/identity/get-user-id-by-email.query.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { GetUserIdByEmailQuery } from "../../../src/contexts/identity/application/queries/get-user-id-by-email.query.js";
import { User } from "../../../src/contexts/identity/domain/entities/user.js";
import { DisplayName } from "../../../src/contexts/identity/domain/value-objects/display-name.js";
import { PasswordHash } from "../../../src/contexts/identity/domain/value-objects/password-hash.js";
import { EmailAddress } from "../../../src/shared-kernel/domain/email-address.js";
import { InMemoryUserRepository } from "./doubles/in-memory-user.repository.js";

describe("GetUserIdByEmailQuery", () => {
  let userRepository: InMemoryUserRepository;
  let query: GetUserIdByEmailQuery;
  let user: User;

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    query = new GetUserIdByEmailQuery(userRepository);

    user = User.register(
      EmailAddress.of("rocio@test.com"),
      PasswordHash.fromStoredHash("hashed:supersecreta"),
      DisplayName.of("Rocío"),
    );
    user.pullDomainEvents();
    await userRepository.save(user);
  });

  test("devuelve el userId cuando el email existe", async () => {
    const userId = await query.execute({ email: EmailAddress.of("rocio@test.com") });

    assert.ok(userId?.equals(user.id));
  });

  test("devuelve null cuando el email no existe", async () => {
    const userId = await query.execute({ email: EmailAddress.of("otro@test.com") });

    assert.equal(userId, null);
  });
});
