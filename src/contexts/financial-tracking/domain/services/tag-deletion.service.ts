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