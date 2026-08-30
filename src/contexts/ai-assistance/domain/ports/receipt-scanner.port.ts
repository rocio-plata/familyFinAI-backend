// contexts/ai-assistance/domain/ports/receipt-scanner.port.ts
interface ReceiptScannerPort {
  scan(image: ReceiptImage, context: FamilyContext): Promise<ReceiptScanResult>;
}

// Value Object de salida cruda del puerto — todavía no es el dominio final,
// es la forma "neutral" que cualquier proveedor debe producir
interface ReceiptScanResult {
  merchantName: string;
  totalAmount: number;
  currency: string;
  date: Date | null;       // puede venir null si el proveedor no lo detecta
  suggestedCategoryHint: string | null;   // texto libre, aún no es un CategoryId real
}