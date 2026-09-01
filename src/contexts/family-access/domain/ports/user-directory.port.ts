// contexts/family-access/domain/ports/user-directory.port.ts
import type { EmailAddress } from "../value-objects/email-address.js";
import type { UserId } from "../value-objects/user-id.js";

interface UserDirectoryPort {
  findUserIdByEmail(email: EmailAddress): Promise<UserId | null>;
}

export type { UserDirectoryPort };
