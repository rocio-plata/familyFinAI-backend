// src/contexts/ai-assistance/infrastructure/providers/fake-receipt-scanner.adapter.ts
import type { FamilyContext } from "../../domain/ports/natural-language-parser.port.js";
import type {
  ReceiptImage,
  ReceiptScannerPort,
  ReceiptScanResult,
} from "../../domain/ports/receipt-scanner.port.js";

class FakeReceiptScanner implements ReceiptScannerPort {
  async scan(image: ReceiptImage, _context: FamilyContext): Promise<ReceiptScanResult> {
    const fileName = image.reference.split("/").pop() ?? "";
    const withoutExtension = fileName.replace(/\.[^.]+$/, "");
    const amountMatch = withoutExtension.match(/(?:^|[-_])(\d+(?:[.,]\d{1,2})?)(?:$|[-_])/);
    const amount = amountMatch?.[1]
      ? Number(amountMatch[1].replace(",", "."))
      : image.sizeInBytes > 0
        ? image.sizeInBytes
        : 1;
    const merchantPart = withoutExtension.replace(/[-_]\d+(?:[.,]\d{1,2})?$/, "");
    const merchantName =
      merchantPart && !/^(receipt|recibo|image|imagen)$/i.test(merchantPart)
        ? merchantPart.replace(/[-_]+/g, " ").trim()
        : "Comercio desconocido";

    return {
      merchantName: merchantName
        ? merchantName.charAt(0).toUpperCase() + merchantName.slice(1)
        : "Comercio desconocido",
      totalAmount: amount,
      currency: "CLP",
      date: image.sizeInBytes > 0 ? new Date() : null,
      suggestedCategoryHint: null,
    };
  }
}

export { FakeReceiptScanner };
