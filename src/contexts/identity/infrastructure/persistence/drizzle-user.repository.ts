// contexts/identity/infrastructure/persistence/drizzle-user.repository.ts
import { eq } from "drizzle-orm";
import { db } from "../../../../platform/db/connection.js";
import type { EmailAddress } from "../../../../shared-kernel/domain/email-address.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import { User } from "../../domain/entities/user.js";
import type { UserRepository } from "../../domain/repositories/user.repository.js";
import { users } from "./schema.js";

class DrizzleUserRepository implements UserRepository {
  async save(user: User): Promise<void> {
    await db
      .insert(users)
      .values({
        id: user.id.toString(),
        email: user.email.toString(),
        passwordHash: user.passwordHashValue, // ver nota abajo
        displayName: user.displayName.toString(),
        createdAt: user.createdAt,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          passwordHash: user.passwordHashValue,
          displayName: user.displayName.toString(),
        },
      });
  }

  async findById(id: UserId): Promise<User | null> {
    const row = await db.query.users.findFirst({ where: eq(users.id, id.toString()) });
    return row ? this.toDomain(row) : null;
  }

  async findByEmail(email: EmailAddress): Promise<User | null> {
    const row = await db.query.users.findFirst({ where: eq(users.email, email.toString()) });
    return row ? this.toDomain(row) : null;
  }

  private toDomain(row: typeof users.$inferSelect): User {
    return User.reconstitute({
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      displayName: row.displayName,
      createdAt: row.createdAt,
    });
  }
}

export { DrizzleUserRepository };
