// contexts/family-access/application/commands/create-family.usecase.ts

import type { EventBus } from "../../../../platform/events/event-bus.js";
import { Family } from "../../domain/entities/family.js";
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import { FamilyName } from "../../domain/value-objects/family-name.js";
import type { UserId } from "../../domain/value-objects/user-id.js";

interface CreateFamilyCommand {
  name: string;
  createdBy: UserId;
}

class CreateFamilyUseCase {
  constructor(
    private readonly familyRepository: FamilyRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateFamilyCommand): Promise<Family> {
    const name = FamilyName.of(command.name);
    const family = Family.create(name, command.createdBy);

    await this.familyRepository.save(family);

    for (const event of family.pullDomainEvents()) {
      await this.eventBus.publish(event);
    }

    return family;
  }
}

export type { CreateFamilyCommand };
export { CreateFamilyUseCase };
