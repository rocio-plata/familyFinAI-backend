// /src/contexts/family-access/infrastructure/adapters/identity-user-directory.adapter.ts

import type { EmailAddress } from "../../../../shared-kernel/domain/email-address.js";
import type { GetUserIdByEmailQuery } from "../../../identity/application/queries/get-user-id-by-email.query.js";
import type { UserRepository } from "../../../identity/domain/repositories/user.repository.js";
import type { UserDirectoryPort } from "../../domain/ports/user-directory.port.js";
import type { UserId } from "../../domain/value-objects/user-id.js";

class IdentityUserDirectoryAdapter implements UserDirectoryPort {
  constructor(
    private readonly getUserIdByEmailQuery: GetUserIdByEmailQuery,
    private readonly userRepository?: UserRepository,
  ) {}

  async findUserIdByEmail(email: EmailAddress): Promise<UserId | null> {
    return this.getUserIdByEmailQuery.execute({ email });
  }

  async findEmailByUserId(userId: UserId): Promise<string | null> {
    const user = await this.userRepository?.findById(userId);
    return user?.email.toString() ?? null;
  }

  async findProfilesByIds(userIds: UserId[]) {
    const users = (await this.userRepository?.findByIds(userIds)) ?? [];
    return users.map((user) => ({
      userId: user.id,
      displayName: user.displayName.toString(),
      email: user.email.toString(),
    }));
  }
}

export { IdentityUserDirectoryAdapter };
