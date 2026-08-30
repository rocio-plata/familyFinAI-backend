Usuario escribe texto
        │
        ▼
AI Assistance (application) ── usa ──▶ NaturalLanguageParserPort (interface)
        │                                        │
        │                              implementado por
        │                                        ▼
        │                         OpenAINaturalLanguageParser (infrastructure)
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