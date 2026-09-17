// tests/contexts/family-access/doubles/fake-user-directory.ts
import type { UserDirectoryPort } from "../../../../src/contexts/family-access/domain/ports/user-directory.port.js";
import type { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import type { EmailAddress } from "../../../../src/shared-kernel/domain/email-address.js";

class FakeUserDirectory implements UserDirectoryPort {
  private readonly usersByEmail = new Map<string, UserId>();

  registerUser(email: EmailAddress, userId: UserId): void {
    this.usersByEmail.set(email.toString(), userId);
  }

  async findUserIdByEmail(email: EmailAddress): Promise<UserId | null> {
    return this.usersByEmail.get(email.toString()) ?? null;
  }
}

export { FakeUserDirectory };
