// tests/contexts/identity/doubles/in-memory-user.repository.ts

import type { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import type { User } from "../../../../src/contexts/identity/domain/entities/user.js";
import type { UserRepository } from "../../../../src/contexts/identity/domain/repositories/user.repository.js";
import type { EmailAddress } from "../../../../src/shared-kernel/domain/email-address.js";

class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async save(user: User): Promise<void> {
    this.users.set(user.id.toString(), user);
  }

  async findById(id: UserId): Promise<User | null> {
    return this.users.get(id.toString()) ?? null;
  }

  async findByEmail(email: EmailAddress): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email.equals(email)) return user;
    }
    return null;
  }
}

export { InMemoryUserRepository };
