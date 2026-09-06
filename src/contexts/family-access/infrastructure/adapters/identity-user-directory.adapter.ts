// /src/contexts/family-access/infrastructure/adapters/identity-user-directory.adapter.ts

import type { GetUserIdByEmailQuery } from "../../../identity/application/queries/get-user-id-by-email.query.js";
import type { UserDirectoryPort } from "../../domain/ports/user-directory.port.js";
import type { EmailAddress } from "../../domain/value-objects/email-address.js";
import type { UserId } from "../../domain/value-objects/user-id.js";

class IdentityUserDirectoryAdapter implements UserDirectoryPort {
  constructor(private readonly getUserIdByEmailQuery: GetUserIdByEmailQuery) {}

  async findUserIdByEmail(email: EmailAddress): Promise<UserId | null> {
    return this.getUserIdByEmailQuery.execute({ email });
  }
}

export { IdentityUserDirectoryAdapter };
