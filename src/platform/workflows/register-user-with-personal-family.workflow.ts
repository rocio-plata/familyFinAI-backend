// /src/platform/workflows/register-user-with-personal-family.workflow.ts
import type { CreateFamilyUseCase } from "../../contexts/family-access/application/commands/create-family.usecase.js";
import type { FamilyId } from "../../contexts/family-access/domain/value-objects/family-id.js";
import type { RegisterUserUseCase } from "../../contexts/identity/application/commands/register-user.usecase.js";
import type { User } from "../../contexts/identity/domain/entities/user.js";
import type { TokenPair } from "../auth/tokens.js";

const PERSONAL_FAMILY_NAME = "Mis finanzas personales";

interface RegisterUserWithPersonalFamilyCommand {
  email: string;
  password: string;
  displayName: string;
}

interface RegisterUserWithPersonalFamilyResult {
  user: User;
  tokens: TokenPair;
  defaultFamilyId: FamilyId;
}

class RegisterUserWithPersonalFamilyWorkflow {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly createFamilyUseCase: CreateFamilyUseCase,
  ) {}

  async execute(
    command: RegisterUserWithPersonalFamilyCommand,
  ): Promise<RegisterUserWithPersonalFamilyResult> {
    const { user, tokens } = await this.registerUserUseCase.execute({
      email: command.email,
      password: command.password,
      displayName: command.displayName,
    });

    // la familia personal es la primera y única del usuario en este momento —
    // no necesita displayOrder explícito, el orden natural por joinedAt ya la deja primera
    const personalFamily = await this.createFamilyUseCase.execute({
      name: PERSONAL_FAMILY_NAME,
      createdBy: user.id,
    });

    return { user, tokens, defaultFamilyId: personalFamily.id };
  }
}

export type { RegisterUserWithPersonalFamilyCommand, RegisterUserWithPersonalFamilyResult };
export { RegisterUserWithPersonalFamilyWorkflow };
