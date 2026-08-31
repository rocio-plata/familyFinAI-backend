// contexts/family-access/application/commands/create-family.usecase.ts
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import { Family } from "../../domain/entities/family.js";
import { FamilyName } from "../../domain/value-objects/family-name.js";
import type { UserId } from "../../domain/value-objects/user-id.js";

interface CreateFamilyCommand {
  name: string;
  createdBy: UserId;
}

class CreateFamilyUseCase {
  constructor(private readonly familyRepository: FamilyRepository) {}

  async execute(command: CreateFamilyCommand): Promise<Family> {
    const name = FamilyName.of(command.name);
    const family = Family.create(name, command.createdBy);

    await this.familyRepository.save(family);

    return family;
  }
}

export { CreateFamilyUseCase };
export type { CreateFamilyCommand };