Usuario escribe texto
        │
        ▼
AI Assistance (application) ── usa ──▶ NaturalLanguageParserPort (interface)
        │                                        │
        │                              implementado por
        │                                        ▼
        │                         FakeNaturalLanguageParser (infrastructure)
        │                                        │
        │                          traduce respuesta cruda → ExpenseSuggestion
        │                                        │
        ◀────────────────────────────────────────┘
        │
        ▼
ExpenseSuggestion (Pending) — se muestra al usuario para revisión
        │
        ▼
Usuario confirma/edita
        │
        ▼
ConfirmSuggestionUseCase ── llama a ──▶ CreateFinancialItemUseCase (de Financial Tracking)
                                                  │
                                                  ▼
                                         FinancialItem creado (dominio real)

Para recibos, `ScanReceiptUseCase` consulta primero `MerchantCategoryHistory` y,
si no hay asociación conocida, usa `FakeReceiptScanner`, resuelve la categoría y
crea una única `ReceiptSuggestion`. Los adaptadores reales de IA quedan para una
fase posterior.