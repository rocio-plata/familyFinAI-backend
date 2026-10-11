// src/contexts/ai-assistance/infrastructure/persistence/in-memory-merchant-category-history.repository.ts
import type { MerchantCategoryHistory } from "../../domain/entities/merchant-category-history.js";
import type { MerchantCategoryHistoryRepository } from "../../domain/repositories/merchant-category-history.repository.js";
import type { MerchantName } from "../../domain/value-objects/merchant-name.js";

class InMemoryMerchantCategoryHistoryRepository implements MerchantCategoryHistoryRepository {
  private readonly histories = new Map<string, MerchantCategoryHistory>();

  async save(history: MerchantCategoryHistory): Promise<void> {
    this.histories.set(
      `${history.familyId}:${history.merchantName.toString().toLowerCase()}`,
      history,
    );
  }

  async findByMerchant(
    familyId: string,
    merchantName: MerchantName,
  ): Promise<MerchantCategoryHistory | null> {
    return this.histories.get(`${familyId}:${merchantName.toString().toLowerCase()}`) ?? null;
  }
}

export { InMemoryMerchantCategoryHistoryRepository };
