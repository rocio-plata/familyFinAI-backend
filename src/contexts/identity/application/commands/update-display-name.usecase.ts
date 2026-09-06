// src/contexts/identity/application/commands/update-display-name.usecase.ts
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import { UserNotFoundError } from "../../domain/errors/user-not-found.error.js";
import type { UserRepository } from "../../domain/repositories/user.repository.js";
import { DisplayName } from "../../domain/value-objects/display-name.js";

interface UpdateDisplayNameCommand {
  userId: UserId;
  displayName: string;
}

class UpdateDisplayNameUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(command: UpdateDisplayNameCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId.toString());
    }

    user.updateDisplayName(DisplayName.of(command.displayName));

    await this.userRepository.save(user);
  }
}

export type { UpdateDisplayNameCommand };
export { UpdateDisplayNameUseCase };
