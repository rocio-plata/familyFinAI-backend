// contexts/ai-assistance/application/scan-receipt.usecase.ts
class ScanReceiptUseCase {
  constructor(
    private readonly scanner: ReceiptScannerPort,
    private readonly merchantHistoryRepository: MerchantCategoryHistoryRepository, // read model
    private readonly categoryLookup: CategoryLookupPort,   // consulta a Financial Tracking (solo lectura)
  ) {}

  async execute(image: ReceiptImage, familyId: FamilyId): Promise<ReceiptSuggestion> {
    // 1. primero se intenta resolver sin IA, usando historial
    const knownAssociation = await this.merchantHistoryRepository.findByMerchant(familyId, /* ... */);

    if (knownAssociation) {
      return ReceiptSuggestion.fromKnownHistory(knownAssociation);  // sin llamar al proveedor de IA
    }

    // 2. si no hay historial, recién ahí se usa el puerto de escaneo (con costo real de IA)
    const scanResult = await this.scanner.scan(image, /* ... */);
    const resolvedCategory = await this.categoryLookup.findByNameHint(familyId, scanResult.suggestedCategoryHint);

    return ReceiptSuggestion.fromScan({ ...scanResult, category: resolvedCategory });
  }
}