// tests/unit/contexts/ai-assistance/doubles/in-memory-merchant-category-history.repository.ts
import type { MerchantCategoryHistory } from "../../../../../src/contexts/ai-assistance/domain/entities/merchant-category-history.js";
import type { MerchantCategoryHistoryRepository } from "../../../../../src/contexts/ai-assistance/domain/repositories/merchant-category-history.repository.js";
import type { MerchantName } from "../../../../../src/contexts/ai-assistance/domain/value-objects/merchant-name.js";

class InMemoryMerchantCategoryHistoryRepository implements MerchantCategoryHistoryRepository {
  private readonly histories: MerchantCategoryHistory[] = [];

  async save(history: MerchantCategoryHistory): Promise<void> {
    const index = this.histories.findIndex(
      (current) =>
        current.familyId === history.familyId && current.merchantName.equals(history.merchantName),
    );
    if (index >= 0) {
      this.histories[index] = history;
      return;
    }
    this.histories.push(history);
  }

  async findByMerchant(
    familyId: string,
    merchantName: MerchantName,
  ): Promise<MerchantCategoryHistory | null> {
    return (
      this.histories.find(
        (history) => history.familyId === familyId && history.merchantName.equals(merchantName),
      ) ?? null
    );
  }
}

export { InMemoryMerchantCategoryHistoryRepository };
