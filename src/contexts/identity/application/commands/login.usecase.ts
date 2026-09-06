// /src/contexts/identity/application/commands/login.usecase.ts
import type { TokenPair, TokenService } from "../../../../platform/auth/tokens.js";
import { EmailAddress } from "../../../family-access/domain/value-objects/email-address.js";
import type { User } from "../../domain/entities/user.js";
import { InvalidCredentialsError } from "../../domain/errors/invalid-credentials.error.js";
import type { UserRepository } from "../../domain/repositories/user.repository.js";

interface LoginCommand {
  email: string;
  password: string;
}

interface LoginResult {
  user: User;
  tokens: TokenPair;
}

class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
    private readonly verifyPassword: (plainText: string, storedHash: string) => boolean,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const email = EmailAddress.of(command.email);
    const user = await this.userRepository.findByEmail(email);

    // mensaje genérico deliberado: no distingue si falló el email o la contraseña
    if (!user?.verifyPassword(command.password, this.verifyPassword)) {
      throw new InvalidCredentialsError();
    }

    const tokens = await this.tokenService.issueTokenPair(user.id);

    return { user, tokens };
  }
}

export type { LoginCommand, LoginResult };
export { LoginUseCase };
