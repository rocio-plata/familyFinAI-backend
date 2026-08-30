class CategoryDeletionService {
  constructor(
    private readonly financialItemRepository: FinancialItemRepository,
  ) {}

  async delete(category: Category): Promise<void> {
    const itemCount = await this.financialItemRepository.countByCategory(category.id);

    if (itemCount > 0) {
      throw new CategoryHasAssociatedItemsError(category.id);
    }

    category.markAsDeleted(); // el agregado solo cambia su propio estado
  }
}