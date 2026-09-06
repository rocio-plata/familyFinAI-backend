// /src/contexts/identity/application/commands/change-password.usecase.ts
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import { InvalidCredentialsError } from "../../domain/errors/invalid-credentials.error.js";
import { UserNotFoundError } from "../../domain/errors/user-not-found.error.js";
import type { UserRepository } from "../../domain/repositories/user.repository.js";
import { PasswordHash } from "../../domain/value-objects/password-hash.js";

interface ChangePasswordCommand {
  userId: UserId;
  currentPassword: string;
  newPassword: string;
}

class ChangePasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashPassword: (plainText: string) => string,
    private readonly verifyPassword: (plainText: string, storedHash: string) => boolean,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId.toString());
    }

    if (!user.verifyPassword(command.currentPassword, this.verifyPassword)) {
      throw new InvalidCredentialsError();
    }

    const newPasswordHash = PasswordHash.fromPlainText(command.newPassword, this.hashPassword);
    user.changePassword(newPasswordHash);

    await this.userRepository.save(user);
  }
}

export type { ChangePasswordCommand };
export { ChangePasswordUseCase };
