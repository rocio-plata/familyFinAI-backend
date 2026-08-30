// src/contexts/financial-tracking/domain/services/tag-deletion.service.ts
import { Tag } from '../entities/tag.js';
import { TagHasAssociatedItemsError } from '../errors/tag-has-associated-items.error.js';
import type { FinancialItemRepository } from '../repositories/financial-item.repository.js';

class TagDeletionService {
  constructor(
    private readonly financialItemRepository: FinancialItemRepository,
  ) {}

  async delete(tag: Tag): Promise<void> {
    const itemCount = await this.financialItemRepository.countByTag(tag.id);

    if (itemCount > 0) {
      throw new TagHasAssociatedItemsError(tag.id);
    }

    // eliminación física real, se remueve de Category.tags
  }

  async deprecate(tag: Tag): Promise<void> {
    tag.deprecate(); // no necesita chequear items — deprecar siempre está permitido
  }
}