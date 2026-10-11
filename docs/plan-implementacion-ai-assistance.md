# Plan de implementación — AI Assistance

Orden lógico para implementar el contexto `AI Assistance`, ya documentado en `casos-de-uso-ai-assistance.md` (7 casos de uso). Sigue el mismo criterio que los planes anteriores: dominio primero, piezas transversales del contexto, luego casos de uso en el orden que menos dependencias tiene, dejando lo menos definido (`AskFinancialQuestion`, `GenerateInsights`) para el final.

**Decisión de arranque**: se empieza con un **adaptador fake determinístico** para `NaturalLanguageParserPort` y `ReceiptScannerPort`, no con un proveedor de IA real todavía. El punto de diseñar primero el puerto y recién después la implementación es exactamente que esto no sea trabajo descartable: cuando elijas proveedor (OpenAI, Anthropic, u otro), se agrega una clase nueva que implementa el mismo puerto — nada del resto del sistema cambia.

---

## Fase 0 — Dominio del contexto

Nada de esto depende de tener un proveedor de IA elegido — es la base común.

1. **Value Objects**: `SuggestionId`, `ConfidenceScore`, `MerchantName`, `ReceiptImageRef` — con tests.
2. **`SuggestionStatus`** (enum: `Pending` | `Confirmed` | `Discarded`).
3. **Entidades**: `ExpenseSuggestion`, `ReceiptSuggestion`, `ConfirmedSuggestion` — con `create()`/`fromScan()`, `confirm()`, `discard()`, getters completos desde el inicio (evitar el ciclo de "falta un getter" que tuvimos varias veces en otros contextos), y `reconstitute()` para cada una desde el principio (ya aprendimos con `Family`/`User` que conviene no dejarlo para después).
4. **Errores**: `SuggestionNotFoundError`, `SuggestionNotPendingError`, `AIProviderUnavailableError`, `UnparseableTextError`, `UnreadableReceiptError` — completos, con tests donde aplique.
5. **`MerchantCategoryHistory`** (entidad simple) + su repositorio — el mecanismo de "ya conozco esta asociación, no llamo a la IA de nuevo".
6. **Puertos**: `NaturalLanguageParserPort`, `ReceiptScannerPort` (ya diseñados hace varias sesiones, formalizar como archivos reales si no lo están). `CategoryLookupPort` hacia `Financial Tracking` (mencionado varias veces, nunca implementado — ahora sí hace falta).
7. **`SuggestionRepository`** (puerto) + doble in-memory.

---

## Fase 1 — Adaptador fake determinístico

Implementa ambos puertos sin tocar ningún proveedor externo — útil tanto para desarrollo como para que los tests de integración no dependan de red ni de costos:

```typescript
// contexts/ai-assistance/infrastructure/providers/fake-natural-language-parser.adapter.ts
class FakeNaturalLanguageParser implements NaturalLanguageParserPort {
  async parse(text: string, context: FamilyContext): Promise<ExpenseSuggestion> {
    // reglas simples y deterministas: ej. busca un número en el texto como monto,
    // usa la fecha actual, deja categoría sin resolver (null) para que el usuario la complete
  }
}
```

```typescript
// contexts/ai-assistance/infrastructure/providers/fake-receipt-scanner.adapter.ts
class FakeReceiptScanner implements ReceiptScannerPort {
  async scan(image: ReceiptImage, context: FamilyContext): Promise<ReceiptScanResult> {
    // devuelve un resultado fijo o derivado de metadatos simples de la imagen (nombre de archivo, tamaño),
    // suficiente para probar el flujo completo sin IA real
  }
}
```

No necesita tests exhaustivos de "inteligencia" (no hay ninguna) — solo confirmar que cumple el contrato del puerto y que el resto del flujo (`ScanReceiptUseCase`, `ConfirmSuggestionUseCase`) funciona con él.

---

## Fase 2 — Casos de uso del flujo núcleo

Con TDD, en este orden:

8. **`ParseNaturalLanguageExpenseUseCase`** — usa `FakeNaturalLanguageParser`, produce un `ExpenseSuggestion` `Pending`, dispara `SuggestionGenerated`.
9. **`ScanReceiptUseCase`** — ya lo esbozamos con código hace varias sesiones (consulta `MerchantCategoryHistory` primero, llama al puerto solo si no hay historial). Usa `FakeReceiptScanner`.
10. **`ConfirmSuggestionUseCase`** — llama al caso de uso público `CreateFinancialItem` de `Financial Tracking` (ya implementado). **Resuelve aquí el pendiente #4** del documento de casos de uso: en vez de depender de que `ItemRecorded` lleve trazabilidad hacia la sugerencia de origen (lo cual acoplaría el evento de `Financial Tracking` a un concepto de `AI Assistance`), el propio `ConfirmSuggestionUseCase` actualiza `MerchantCategoryHistory` **directamente**, de forma síncrona, ya que tiene todo el contexto necesario en memoria (el `merchantName` de la sugerencia, la categoría confirmada) sin necesitar ningún evento. Dispara `SuggestionConfirmed` y `MerchantCategoryLearned`.
11. **`DiscardSuggestionUseCase`** — el más simple, dispara `SuggestionDiscarded`.

---

## Fase 3 — Rutas HTTP del flujo núcleo

Mismo checklist ya establecido (schema + `authenticate` + `requireFamilyMembership` + handler delgado):

12. `POST /families/:familyId/suggestions/text` (`ParseNaturalLanguageExpense`).
13. `POST /families/:familyId/suggestions/receipt` (`ScanReceipt`) — requiere resolver el mecanismo de upload de imagen (`multipart/form-data`, soportado por Fastify vía `@fastify/multipart` — única dependencia nueva de todo este plan, justificada porque no hay forma razonable de subir una imagen sin ella).
14. `POST /families/:familyId/suggestions/:suggestionId/confirm` (`ConfirmSuggestion`).
15. `DELETE /families/:familyId/suggestions/:suggestionId` (`DiscardSuggestion`).

---

## Fase 4 — Persistencia real (Drizzle)

16. Schema: `suggestions` (con discriminador `source: "TEXT" | "RECEIPT"`, como ya se diseñó en la guía de integración), `merchant_category_history`.
17. `DrizzleSuggestionRepository`, `DrizzleMerchantCategoryHistoryRepository` — con `reconstitute()` en las entidades si no se hizo ya en la Fase 0.
18. `buildAiAssistanceModule()` — mismo patrón de composición que los otros contextos.

---

## Fase 5 — Lo menos definido (resolver diseño antes de implementar)

Estos dos casos de uso siguen sin suficiente definición para empezar TDD directamente — antes de tocarlos, conviene retomar los pendientes que quedaron abiertos en `casos-de-uso-ai-assistance.md`:

19. **`AskFinancialQuestion`**: falta decidir el mecanismo de "pregunta libre → consulta estructurada hacia `Reporting`". Con un proveedor de IA real que soporte *function calling* (tool use), esto se resuelve de forma natural (el modelo elige qué función de `Reporting` llamar); con el adaptador fake, habría que simular esto con un set fijo de patrones reconocidos — probablemente no vale la pena implementarlo en profundidad hasta tener un proveedor real elegido.
20. **`GenerateInsights`**: decidir si se resuelve con plantillas de texto simples (sin IA, aprovechando `GetPeriodComparison` de `Reporting` ya implementado) o si justifica invocar al proveedor para redactar de forma más natural. Dada la filosofía de costos del proyecto ("no usar IA donde no aporta valor"), la opción de plantillas es la más coherente para implementar primero, dejando la redacción con IA real como mejora posterior.

---

## Fase 6 — Pendiente transversal, no bloqueante

21. **Rate limiting de uso de IA**: mencionado en la especificación original como requisito de seguridad, no modelado todavía en ningún caso de uso — probablemente un middleware en `platform/`, no parte del dominio de `AI Assistance`. No bloquea nada de lo anterior; se puede abordar en paralelo o al final.

---

## Resumen visual

```
Fase 0: Dominio (VOs, entidades, errores, puertos, MerchantCategoryHistory)
   │
   ▼
Fase 1: Adaptador fake determinístico (implementa los puertos de la Fase 0)
   │
   ▼
Fase 2: ParseNaturalLanguageExpense, ScanReceipt, ConfirmSuggestion, DiscardSuggestion
   │
   ▼
Fase 3: Rutas HTTP del flujo núcleo (+ @fastify/multipart para el upload de recibos)
   │
   ▼
Fase 4: Persistencia real con Drizzle
   │
   ▼
Fase 5: AskFinancialQuestion / GenerateInsights — requieren resolver diseño primero
   │
Fase 6: Rate limiting (paralelo, no bloqueante)
```

Cuando elijas proveedor de IA real, el punto de entrada es reemplazar `FakeNaturalLanguageParser`/`FakeReceiptScanner` por las clases reales en `buildAiAssistanceModule()` — todo lo construido en las Fases 2-4 sigue funcionando sin cambios, porque dependen del puerto, no de la implementación.
