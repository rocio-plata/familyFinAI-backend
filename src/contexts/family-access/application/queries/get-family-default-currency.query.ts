// src/contexts/family-access/application/queries/get-family-default-currency.query.ts

import type { Currency } from "../../../../shared-kernel/domain/currency.js";
import { FamilyNotFoundError } from "../../domain/errors/family-not-found.error.js";
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import type { FamilyId } from "../../domain/value-objects/family-id.js";

interface GetFamilyDefaultCurrencyInput {
  familyId: FamilyId;
}

class GetFamilyDefaultCurrencyQuery {
  constructor(private readonly familyRepository: FamilyRepository) {}

  async execute(input: GetFamilyDefaultCurrencyInput): Promise<Currency> {
    const family = await this.familyRepository.findById(input.familyId);
    if (!family) throw new FamilyNotFoundError(input.familyId);

    return family.defaultCurrency;
  }
}

export { GetFamilyDefaultCurrencyQuery };
