// contexts/family-access/application/commands/change-default-currency.usecase.ts

import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { FamilyNotFoundError } from "../../domain/errors/family-not-found.error.js";
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import type { FamilyId } from "../../domain/value-objects/family-id.js";
import type { UserId } from "../../domain/value-objects/user-id.js";

interface ChangeDefaultCurrencyCommand {
  familyId: FamilyId;
  newCurrency: string;
  changedBy: UserId;
}

class ChangeDefaultCurrencyUseCase {
  constructor(private readonly familyRepository: FamilyRepository) {}

  async execute(command: ChangeDefaultCurrencyCommand): Promise<void> {
    const family = await this.familyRepository.findById(command.familyId);
    if (!family) throw new FamilyNotFoundError(command.familyId);

    const currency = Currency.of(command.newCurrency);
    family.changeDefaultCurrency(currency, command.changedBy);

    await this.familyRepository.save(family);
  }
}

export type { ChangeDefaultCurrencyCommand };
export { ChangeDefaultCurrencyUseCase };
