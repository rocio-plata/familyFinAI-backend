// src/contexts/ai-assistance/domain/ports/receipt-scanner.port.ts
import type { FamilyContext } from "./natural-language-parser.port.js";

type ReceiptImage = {
  reference: string;
  contentType: string;
  sizeInBytes: number;
};

type ReceiptScanResult = {
  merchantName: string;
  totalAmount: number;
  currency: string;
  date: Date | null;
  suggestedCategoryHint: string | null;
};

interface ReceiptScannerPort {
  scan(image: ReceiptImage, context: FamilyContext): Promise<ReceiptScanResult>;
}

export type { ReceiptImage, ReceiptScannerPort, ReceiptScanResult };
