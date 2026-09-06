// /src/contexts/identity/infrastructure/persistence/in-memory-user.repository.ts
import type { EmailAddress } from "../../../family-access/domain/value-objects/email-address.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import type { User } from "../../domain/entities/user.js";
import type { UserRepository } from "../../domain/repositories/user.repository.js";

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
