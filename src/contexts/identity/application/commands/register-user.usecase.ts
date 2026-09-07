// /src/contexts/identity/application/commands/register-user.usecase.ts

import type { TokenPair, TokenService } from "../../../../platform/auth/tokens.js";
import type { EventBus } from "../../../../platform/events/event-bus.js";
import { EmailAddress } from "../../../../shared-kernel/domain/email-address.js";
import { User } from "../../domain/entities/user.js";
import { EmailAlreadyRegisteredError } from "../../domain/errors/email-already-registered.error.js";
import type { UserRepository } from "../../domain/repositories/user.repository.js";
import { DisplayName } from "../../domain/value-objects/display-name.js";
import { PasswordHash } from "../../domain/value-objects/password-hash.js";

interface RegisterUserCommand {
  email: string;
  password: string;
  displayName: string;
}

interface RegisterUserResult {
  user: User;
  tokens: TokenPair;
}

class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
    private readonly eventBus: EventBus,
    private readonly hashPassword: (plainText: string) => string,
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisterUserResult> {
    const email = EmailAddress.of(command.email);

    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new EmailAlreadyRegisteredError(email.toString());
    }

    const passwordHash = PasswordHash.fromPlainText(command.password, this.hashPassword);
    const displayName = DisplayName.of(command.displayName);

    const user = User.register(email, passwordHash, displayName);
    await this.userRepository.save(user);

    for (const event of user.pullDomainEvents()) {
      await this.eventBus.publish(event);
    }

    const tokens = await this.tokenService.issueTokenPair(user.id);

    return { user, tokens };
  }
}

export type { RegisterUserCommand, RegisterUserResult };
export { RegisterUserUseCase };
