// /src/contexts/family-access/application/commands/reorder-my-families.usecase.ts
import { InvalidFamilyOrderError } from "../../domain/errors/invalid-family-order.error.js";
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import type { FamilyId } from "../../domain/value-objects/family-id.js";
import type { UserId } from "../../domain/value-objects/user-id.js";

interface ReorderMyFamiliesCommand {
  userId: UserId;
  orderedFamilyIds: FamilyId[];
}

class ReorderMyFamiliesUseCase {
  constructor(private readonly familyRepository: FamilyRepository) {}

  async execute(command: ReorderMyFamiliesCommand): Promise<void> {
    const currentFamilies = await this.familyRepository.findAllByMemberUserId(command.userId);

    const sameLength = command.orderedFamilyIds.length === currentFamilies.length;
    const noDuplicates =
      new Set(command.orderedFamilyIds.map((id) => id.toString())).size ===
      command.orderedFamilyIds.length;
    const sameSet =
      sameLength &&
      noDuplicates &&
      currentFamilies.every((family) =>
        command.orderedFamilyIds.some((id) => id.equals(family.id)),
      );

    if (!sameSet) {
      throw new InvalidFamilyOrderError();
    }

    for (const [index, familyId] of command.orderedFamilyIds.entries()) {
      const family = currentFamilies.find((f) => f.id.equals(familyId));
      // no debería ser null dada la validación anterior — resguardo defensivo para TypeScript
      if (!family) continue;

      family.setMemberDisplayOrder(command.userId, index);
      await this.familyRepository.save(family);
    }
  }
}

export type { ReorderMyFamiliesCommand };
export { ReorderMyFamiliesUseCase };
