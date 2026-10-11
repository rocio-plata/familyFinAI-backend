# AI Assistance — Casos de uso

Documentación de los casos de uso del contexto `AI Assistance`, previa a su implementación (algunos ya fueron esbozados con código en sesiones anteriores — este documento los formaliza y completa el catálogo). Sigue la misma convención usada en los documentos anteriores: **actor**, **precondiciones**, **flujo principal**, **flujos alternativos/errores**, **eventos de dominio disparados**.

Recordatorio de arquitectura: `AI Assistance` es un contexto **genérico**, regido por la filosofía **"la IA propone, el usuario confirma"** — nunca escribe directamente en `Financial Tracking`. Cada capacidad de IA se define como un **puerto** (`NaturalLanguageParserPort`, `ReceiptScannerPort`, `NaturalLanguageQueryPort`), implementado por un **adaptador** que traduce la respuesta del proveedor externo a conceptos del propio dominio (Anticorruption Layer).

---

## Comandos

### 1. ParseNaturalLanguageExpense

Interpreta un texto libre del usuario y genera una sugerencia de gasto/ingreso.

- **Actor**: un `Member` de la familia, escribiendo texto libre (ej. *"gasté $25.000 en bencina ayer"*).
- **Precondiciones**: ninguna especial — cualquier miembro puede usar esta función.
- **Entrada**: `familyId`, `requestedBy` (UserId), `rawText`.
- **Flujo principal**:
  1. Se invoca `NaturalLanguageParserPort.parse(rawText, familyContext)`.
  2. El adaptador (ej. `OpenAINaturalLanguageParser`) traduce la respuesta del proveedor a los Value Objects del dominio (`Money`, `TransactionDate`, etc.), intentando resolver `categoryId`/`tagId` según el texto detectado.
  3. Se construye un `ExpenseSuggestion` en estado `Pending` con el resultado, incluyendo su `ConfidenceScore`.
  4. Se persiste vía `SuggestionRepository.save()`.
  5. Se devuelve la sugerencia al usuario para su revisión — **no** se crea ningún `FinancialItem` todavía.
- **Errores posibles**: `AIProviderUnavailableError` (el proveedor de IA falla o no responde), `UnparseableTextError` (el texto no contiene información financiera reconocible).
- **Eventos disparados**: `SuggestionGenerated`.

**Estado de implementación**: implementado en `ParseNaturalLanguageExpenseUseCase`. Recibe `FamilyId`, `UserId` y texto libre, delega en `NaturalLanguageParserPort`, persiste mediante `SuggestionRepository` y publica los eventos pendientes mediante `EventBus`. El adaptador fake determinista está disponible para desarrollo y tests.

---

### 2. ScanReceipt

Analiza una foto de un recibo y genera una sugerencia de gasto — ya definido en detalle en una sesión anterior, se documenta aquí para completar el catálogo.

- **Actor**: un `Member` de la familia, subiendo una foto de un recibo.
- **Precondiciones**: ninguna especial.
- **Entrada**: `familyId`, `requestedBy`, `image` (`ReceiptImage`).
- **Flujo principal**:
  1. Se consulta primero `MerchantCategoryHistoryRepository.findByMerchant()` — si existe una asociación conocida para ese comercio, se genera la sugerencia **sin** llamar al proveedor de IA (ahorro de costos).
  2. Si no hay historial, se invoca `ReceiptScannerPort.scan(image, familyContext)`.
  3. El adaptador traduce la respuesta cruda del proveedor a `ReceiptScanResult` (forma "neutral", aún no resuelta contra el dominio).
  4. Se resuelve `suggestedCategoryHint` contra las categorías reales de la familia, vía `CategoryLookupPort` (hacia `Financial Tracking`).
  5. Se construye un único `ReceiptSuggestion` en estado `Pending` — **siempre un solo movimiento por recibo**, nunca se divide automáticamente.
  6. Se persiste.
- **Errores posibles**: `AIProviderUnavailableError`, `UnreadableReceiptError` (la imagen no permite extraer datos mínimos como el monto).
- **Eventos disparados**: `SuggestionGenerated`.

**Estado de implementación**: implementado en `ScanReceiptUseCase`. Consulta primero una pista local del comercio contra `MerchantCategoryHistoryRepository`; si no encuentra historial, invoca `ReceiptScannerPort`, resuelve la categoría con `CategoryLookupPort`, persiste una única `ReceiptSuggestion` y publica `SuggestionGenerated`. Los resultados sin monto válido se rechazan con `UnreadableReceiptError`.

---

### 3. ConfirmSuggestion

El usuario revisa una sugerencia (de texto o de recibo), la edita si es necesario, y la confirma — creando recién ahí el `FinancialItem` real.

- **Actor**: el `Member` que solicitó la sugerencia (o cualquier miembro con permisos — ver pendientes).
- **Precondiciones**: la `Suggestion` existe, pertenece a la familia, y está en estado `Pending`.
- **Entrada**: `familyId`, `suggestionId`, `edits` (campos opcionales que el usuario corrigió antes de confirmar: monto, categoría, tag, fecha, título).
- **Flujo principal**:
  1. Se busca la `Suggestion` (`ExpenseSuggestion` o `ReceiptSuggestion`) por `suggestionId`.
  2. Se invoca `suggestion.confirm(edits)`, que aplica las correcciones del usuario y devuelve un `ConfirmedSuggestion`.
  3. Se llama al caso de uso público `CreateFinancialItem` de `Financial Tracking` con los datos ya confirmados — **nunca** se accede al dominio interno de `Financial Tracking` directamente (Anticorruption Layer / límite de contexto).
  4. Se persiste el nuevo estado de la `Suggestion` (`Confirmed`).
  5. Si la sugerencia vino de un recibo, el propio caso de uso actualiza `MerchantCategoryHistoryRepository` **directamente, de forma síncrona** (no vía event handler) — ya tiene en memoria todo lo necesario (`merchantName`, categoría confirmada), sin requerir que `ItemRecorded` lleve ninguna trazabilidad hacia la sugerencia de origen. *(Decisión resuelta en `plan-implementacion-ai-assistance.md`: reemplaza al `OnItemRecordedHandler` que se mencionaba antes en la sección de Event Handlers.)*
- **Errores posibles**: `SuggestionNotFoundError`, `SuggestionNotPendingError` (ya fue confirmada o descartada).
- **Eventos disparados**: `SuggestionConfirmed`, y `MerchantCategoryLearned` si corresponde (disparado por el propio caso de uso, no por un handler externo).

**Estado de implementación**: implementado en `ConfirmSuggestionUseCase`. Convierte la sugerencia confirmada al contrato público de `CreateFinancialItemUseCase`, persiste el estado confirmado y, para recibos, crea o refuerza `MerchantCategoryHistory` de forma síncrona y publica `MerchantCategoryLearned`.

---

### 4. DiscardSuggestion

El usuario descarta una sugerencia sin crear ningún movimiento.

- **Actor**: mismo criterio que `ConfirmSuggestion`.
- **Precondiciones**: la `Suggestion` existe y está `Pending`.
- **Entrada**: `familyId`, `suggestionId`.
- **Flujo principal**:
  1. Se busca la `Suggestion`.
  2. Se invoca `suggestion.discard()`.
  3. Se persiste.
- **Errores posibles**: `SuggestionNotFoundError`, `SuggestionNotPendingError`.
- **Eventos disparados**: `SuggestionDiscarded`.
- **Nota de producto**: según lo documentado en el catálogo de eventos original, este evento es útil como métrica de calidad del modelo de IA (cuántas sugerencias se descartan vs. se confirman) — dato relevante para la memoria del TFM como evaluación del sistema.

**Estado de implementación**: implementado en `DiscardSuggestionUseCase`. Verifica la familia, descarta y persiste la sugerencia pendiente y publica `SuggestionDiscarded`.

Las cuatro operaciones están expuestas por `ai-assistance.routes.ts` con autenticación, membresía familiar, schemas Fastify y soporte multipart para recibos.

---

### 5. AskFinancialQuestion

Consulta en lenguaje natural sobre las finanzas de la propia familia (ej. *"¿cuánto gastamos en restaurantes los últimos tres meses?"*).

- **Actor**: un `Member` de la familia.
- **Precondiciones**: ninguna especial.
- **Entrada**: `familyId`, `requestedBy`, `question` (texto libre).
- **Flujo principal**:
  1. Se invoca `NaturalLanguageQueryPort.ask(question, familyContext)`.
  2. El puerto necesita acceso a datos reales de la familia para responder — probablemente combinando el texto de la pregunta con una consulta a `Reporting` (ej. `GetPeriodComparison`, `GetCategoryBreakdown`) según lo que el modelo interprete que se está preguntando.
  3. Se devuelve una respuesta en lenguaje natural, generada a partir de datos reales — **nunca** el modelo inventa cifras, solo redacta sobre lo que `Reporting` le provee.
- **Errores posibles**: `AIProviderUnavailableError`, `UnparseableQuestionError` (la pregunta no se puede mapear a ninguna consulta financiera reconocible).
- **Eventos disparados**: ninguno.
- **Nota de diseño**: este es el caso de uso menos definido del contexto — el mecanismo exacto de "traducir pregunta libre → consulta estructurada a Reporting" no está resuelto (ver pendientes). Es el que corresponde al puerto `NaturalLanguageQueryPort`, mencionado varias veces pero nunca implementado.

---

### 6. GenerateInsights

Genera recomendaciones e insights proactivos basados en los datos reales de la familia (ej. *"tus gastos en restaurantes subieron 35% este mes"*, *"¿dónde podríamos reducir gastos?"*).

- **Actor**: puede ser invocado por el usuario explícitamente, o de forma programada (ver pendientes, mismo tipo de duda que `ClosePeriod` en `Budgeting`).
- **Entrada**: `familyId`, `period` (opcional, default: mes actual).
- **Flujo principal**:
  1. Se consultan comparaciones relevantes vía `Reporting` (`GetPeriodComparison` para varias categorías, buscando variaciones significativas).
  2. Se seleccionan los hallazgos más relevantes (criterio a definir — ¿top 3 variaciones porcentuales más grandes? ¿solo las que superan un umbral?).
  3. Se invoca al proveedor de IA (o se usa lógica determinística simple, sin IA, si el hallazgo ya viene calculado por `Reporting` — ver pendientes de costos) para redactar el insight en lenguaje natural.
  4. Se devuelve la lista de insights generados.
- **Errores posibles**: `AIProviderUnavailableError` (solo si se usa IA para la redacción).
- **Eventos disparados**: ninguno definido.
- **Nota de diseño**: es el caso de uso menos maduro de todo el catálogo — no está claro si necesita IA generativa en absoluto (podría ser texto con plantillas: `"Tus gastos en {categoría} subieron {porcentaje}% respecto al mes anterior"`, sin ningún costo de IA) o si se justifica invocar un modelo para redacción más natural. Ver pendientes.

---

## Event Handlers

Ninguno en este contexto — la actualización de `MerchantCategoryHistory` se resolvió como parte síncrona de `ConfirmSuggestion` (ver caso de uso 3), no como una reacción a un evento externo.

---

## Resumen de errores nuevos a definir

| Error | Casos de uso donde aparece | ¿Ya existe? |
|---|---|---|
| `AIProviderUnavailableError` | ParseNaturalLanguageExpense, ScanReceipt, AskFinancialQuestion, GenerateInsights | ❌ nuevo |
| `UnparseableTextError` | ParseNaturalLanguageExpense | ❌ nuevo |
| `UnreadableReceiptError` | ScanReceipt | ❌ nuevo |
| `SuggestionNotFoundError` | ConfirmSuggestion, DiscardSuggestion | ❌ nuevo |
| `SuggestionNotPendingError` | ConfirmSuggestion, DiscardSuggestion | ❌ nuevo |
| `UnparseableQuestionError` | AskFinancialQuestion | ❌ nuevo |

## Pendientes antes de implementar

1. **Permisos**: mismo punto abierto que en los demás contextos — ¿cualquier `Member` puede confirmar/descartar sugerencias ajenas (generadas por otro miembro), o solo quien las generó?
2. **`NaturalLanguageQueryPort` sin definir**: `AskFinancialQuestion` es el caso de uso menos resuelto del catálogo completo del proyecto — falta decidir el mecanismo de traducción "pregunta libre → consulta estructurada a `Reporting`" (¿function calling del proveedor de IA? ¿un set fijo de intents reconocidos?).
3. **`GenerateInsights` — ¿necesita IA real?**: a evaluar si se puede resolver con plantillas de texto (sin costo de IA) para el MVP, dejando la redacción más natural como mejora futura — coherente con la estrategia de costos de IA de la especificación original ("no usar IA para operaciones que no la necesiten").
4. ~~Trazabilidad `ReceiptSuggestion → FinancialItem → OnItemRecordedHandler`~~ — **resuelto**: `ConfirmSuggestion` actualiza `MerchantCategoryHistory` directamente, de forma síncrona (ver caso de uso 3). No hace falta que `ItemRecorded` lleve ninguna referencia hacia la sugerencia de origen, y el `OnItemRecordedHandler` que se mencionaba antes queda descartado.
5. **Rate limiting / control de costos de IA**: mencionado como requisito de seguridad en la especificación original ("límites de uso de IA"), pero no está modelado en ningún caso de uso todavía — probablemente vive en `platform/` como middleware transversal, no dentro del dominio de `AI Assistance`.
