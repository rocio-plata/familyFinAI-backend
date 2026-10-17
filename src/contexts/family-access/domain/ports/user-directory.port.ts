// /src/contexts/family-access/domain/ports/user-directory.port.ts
import type { EmailAddress } from "../../../../shared-kernel/domain/email-address.js";
import type { UserId } from "../value-objects/user-id.js";

interface UserDirectoryPort {
  findUserIdByEmail(email: EmailAddress): Promise<UserId | null>;
  findEmailByUserId?(userId: UserId): Promise<string | null>;
  findProfilesByIds?(userIds: UserId[]): Promise<UserDirectoryProfile[]>;
}

interface UserDirectoryProfile {
  userId: UserId;
  displayName: string;
  email: string;
}

export type { UserDirectoryPort, UserDirectoryProfile };
