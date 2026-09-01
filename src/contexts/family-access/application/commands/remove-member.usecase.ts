// contexts/family-access/application/commands/remove-member.usecase.ts

import type { EventBus } from "../../../../platform/events/event-bus.js";
import { FamilyNotFoundError } from "../../domain/errors/family-not-found.error.js";
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import type { FamilyId } from "../../domain/value-objects/family-id.js";
import type { UserId } from "../../domain/value-objects/user-id.js";

interface RemoveMemberCommand {
  familyId: FamilyId;
  memberId: UserId;
  removedBy: UserId;
}

class RemoveMemberUseCase {
  constructor(
    private readonly familyRepository: FamilyRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RemoveMemberCommand): Promise<void> {
    const family = await this.familyRepository.findById(command.familyId);
    if (!family) throw new FamilyNotFoundError(command.familyId);

    family.removeMember(command.memberId, command.removedBy);
    await this.familyRepository.save(family);

    for (const event of family.pullDomainEvents()) {
      await this.eventBus.publish(event);
    }
  }
}

export type { RemoveMemberCommand };
export { RemoveMemberUseCase };
