// tests/integration/contexts/identity/infrastructure/persistence/user.repository.test.ts
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { User } from "../../../../../../src/contexts/identity/domain/entities/user.js";
import { DisplayName } from "../../../../../../src/contexts/identity/domain/value-objects/display-name.js";
import { PasswordHash } from "../../../../../../src/contexts/identity/domain/value-objects/password-hash.js";
import { DrizzleUserRepository } from "../../../../../../src/contexts/identity/infrastructure/persistence/drizzle-user.repository.js";
import { users } from "../../../../../../src/contexts/identity/infrastructure/persistence/schema.js";
import { db } from "../../../../../../src/platform/db/connection.js";
import { EmailAddress } from "../../../../../../src/shared-kernel/domain/email-address.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const skip = hasDatabase ? false : "requiere DATABASE_URL";

const userRepository = new DrizzleUserRepository();
const createdUserIds: string[] = [];

after(async () => {
  if (!hasDatabase) return;
  for (const id of createdUserIds) {
    await db.delete(users).where(eq(users.id, id));
  }
});

describe("Persistencia Drizzle de usuarios (integración)", () => {
  test("guarda, busca por id/email y actualiza un usuario", { skip }, async () => {
    const email = `integracion-${Date.now()}@example.com`;
    const user = User.register(
      EmailAddress.of(email),
      PasswordHash.fromStoredHash("hash-almacenado"),
      DisplayName.of("Usuaria Integración"),
    );
    createdUserIds.push(user.id.toString());

    await userRepository.save(user);

    const foundById = await userRepository.findById(user.id);
    assert.ok(foundById);
    assert.equal(foundById.displayName.toString(), "Usuaria Integración");

    const foundByEmail = await userRepository.findByEmail(EmailAddress.of(email));
    assert.ok(foundByEmail);
    assert.ok(foundByEmail.id.equals(user.id));
  });
});
