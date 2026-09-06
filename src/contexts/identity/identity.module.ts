// /src/contexts/identity/identity.module.ts
import type { TokenService } from "../../platform/auth/tokens.js";
import type { EventBus } from "../../platform/events/event-bus.js";
import { ChangePasswordUseCase } from "./application/commands/change-password.usecase.js";
import { LoginUseCase } from "./application/commands/login.usecase.js";
import { RegisterUserUseCase } from "./application/commands/register-user.usecase.js";
import { GetUserIdByEmailQuery } from "./application/queries/get-user-id-by-email.query.js";
import { GetUserProfileQuery } from "./application/queries/get-user-profile.query.js";
import type { UserRepository } from "./domain/repositories/user.repository.js";

interface IdentityModuleDependencies {
  userRepository: UserRepository;
  tokenService: TokenService;
  eventBus: EventBus;
  hashPassword: (plainText: string) => string;
  verifyPassword: (plainText: string, storedHash: string) => boolean;
}

interface IdentityModule {
  useCases: {
    registerUser: RegisterUserUseCase;
    login: LoginUseCase;
    changePassword: ChangePasswordUseCase;
    getUserProfile: GetUserProfileQuery;
    getUserIdByEmail: GetUserIdByEmailQuery;
  };
}

function buildIdentityModule(deps: IdentityModuleDependencies): IdentityModule {
  const useCases = {
    registerUser: new RegisterUserUseCase(
      deps.userRepository,
      deps.tokenService,
      deps.eventBus,
      deps.hashPassword,
    ),
    login: new LoginUseCase(deps.userRepository, deps.tokenService, deps.verifyPassword),
    changePassword: new ChangePasswordUseCase(
      deps.userRepository,
      deps.hashPassword,
      deps.verifyPassword,
    ),
    getUserProfile: new GetUserProfileQuery(deps.userRepository),
    getUserIdByEmail: new GetUserIdByEmailQuery(deps.userRepository),
  };

  return { useCases };
}

export type { IdentityModule, IdentityModuleDependencies };
export { buildIdentityModule };
