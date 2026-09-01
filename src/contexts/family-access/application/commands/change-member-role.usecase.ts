// contexts/family-access/application/commands/change-member-role.usecase.ts

import type { EventBus } from "../../../../platform/events/event-bus.js";
import { FamilyNotFoundError } from "../../domain/errors/family-not-found.error.js";
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import type { FamilyId } from "../../domain/value-objects/family-id.js";
import type { Role } from "../../domain/value-objects/role.js";
import type { UserId } from "../../domain/value-objects/user-id.js";

interface ChangeMemberRoleCommand {
  familyId: FamilyId;
  memberId: UserId;
  newRole: Role;
  changedBy: UserId;
}

class ChangeMemberRoleUseCase {
  constructor(
    private readonly familyRepository: FamilyRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ChangeMemberRoleCommand): Promise<void> {
    const family = await this.familyRepository.findById(command.familyId);
    if (!family) throw new FamilyNotFoundError(command.familyId);

    family.changeRole(command.memberId, command.newRole, command.changedBy);
    await this.familyRepository.save(family);

    for (const event of family.pullDomainEvents()) {
      await this.eventBus.publish(event);
    }
  }
}

export type { ChangeMemberRoleCommand };
export { ChangeMemberRoleUseCase };
