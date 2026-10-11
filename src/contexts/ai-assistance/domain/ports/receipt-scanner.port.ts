// src/contexts/ai-assistance/domain/ports/receipt-scanner.port.ts
import type { ReceiptSuggestion } from "../entities/receipt-suggestion.js";
import type { FamilyContext } from "./natural-language-parser.port.js";

type ReceiptImage = {
  reference: string;
  contentType: string;
  sizeInBytes: number;
};

interface ReceiptScannerPort {
  scan(image: ReceiptImage, context: FamilyContext): Promise<ReceiptSuggestion>;
}

export type { ReceiptImage, ReceiptScannerPort };
