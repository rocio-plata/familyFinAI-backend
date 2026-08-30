// contexts/ai-assistance/infrastructure/providers/vision-receipt-scanner.adapter.ts
class VisionReceiptScannerAdapter implements ReceiptScannerPort {
  async scan(image: ReceiptImage, context: FamilyContext): Promise<ReceiptScanResult> {
    const rawResponse = await this.visionClient.analyze(image.toBase64());  // formato propio del proveedor
    return this.translate(rawResponse);
  }

  private translate(raw: ProviderVisionResponse): ReceiptScanResult {
    return {
      merchantName: raw.detected_merchant ?? "Unknown",
      totalAmount: this.parseAmount(raw.total_text),   // el proveedor puede devolver "$85.450" como string
      currency: this.inferCurrency(raw),
      date: this.parseDate(raw.date_text),
      suggestedCategoryHint: this.mapMerchantToCategoryHint(raw.detected_merchant),
    };
  }
}