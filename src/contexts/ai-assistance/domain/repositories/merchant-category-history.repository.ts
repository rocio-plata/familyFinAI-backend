// src/contexts/ai-assistance/domain/repositories/merchant-category-history.repository.ts
import type { MerchantCategoryHistory } from "../entities/merchant-category-history.js";
import type { MerchantName } from "../value-objects/merchant-name.js";

interface MerchantCategoryHistoryRepository {
  save(history: MerchantCategoryHistory): Promise<void>;
  findByMerchant(
    familyId: string,
    merchantName: MerchantName,
  ): Promise<MerchantCategoryHistory | null>;
}

export type { MerchantCategoryHistoryRepository };
