// /src/contexts/identity/domain/repositories/user.repository.ts
import type { EmailAddress } from "../../../../shared-kernel/domain/email-address.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import type { User } from "../entities/user.js";

interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: EmailAddress): Promise<User | null>;
}

export type { UserRepository };
