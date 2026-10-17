// src/contexts/family-access/application/queries/get-family-settings.query.ts

import { FamilyNotFoundError } from "../../domain/errors/family-not-found.error.js";
import { CurrencyChangePolicy } from "../../domain/policies/currency-change-policy.js";
import type { FamilyFinancialActivityPort } from "../../domain/ports/family-financial-activity.port.js";
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import type { FamilyId } from "../../domain/value-objects/family-id.js";

interface GetFamilySettingsInput {
  familyId: FamilyId;
}

interface FamilySettingsDTO {
  defaultCurrency: string;
  currencyLocked: boolean;
  currencyLockReasons: string[];
}

class GetFamilySettingsQuery {
  constructor(
    private readonly familyRepository: FamilyRepository,
    private readonly financialActivity?: FamilyFinancialActivityPort,
    private readonly currencyChangePolicy = new CurrencyChangePolicy(),
  ) {}

  async execute(input: GetFamilySettingsInput): Promise<FamilySettingsDTO> {
    const family = await this.familyRepository.findById(input.familyId);
    if (!family) throw new FamilyNotFoundError(input.familyId);

    if (!this.financialActivity) {
      return {
        defaultCurrency: family.defaultCurrency.toString(),
        currencyLocked: false,
        currencyLockReasons: [],
      };
    }

    const [hasItems, hasActiveBudgets] = await Promise.all([
      this.financialActivity.hasItems(input.familyId),
      this.financialActivity.hasActiveBudgets(input.familyId),
    ]);
    const reasons = this.currencyChangePolicy.evaluate(hasItems, hasActiveBudgets);

    return {
      defaultCurrency: family.defaultCurrency.toString(),
      currencyLocked: reasons.length > 0,
      currencyLockReasons: reasons,
    };
  }
}

export type { FamilySettingsDTO, GetFamilySettingsInput };
export { GetFamilySettingsQuery };
