# Revision de AI Assistance contra `main`

## Decision

La implementacion de `AI Assistance` se construira desde la rama `main` siguiendo el plan actual.

La rama antigua `origin/feature/ai-assistance` no se utilizara como fuente de codigo ni se hara cherry-pick de sus commits. La rama actual `feature/ai-assistance` contiene la implementacion nueva de las fases 0 y 1, construida desde `main`.

La fuente de verdad para el trabajo sera:

- `docs/plan-implementacion-ai-assistance.md`
- `docs/uses-cases/casos-de-uso-ai-assistance.md`
- La arquitectura y las convenciones vigentes en `main`.

## Estado actual en `main`

El contexto `src/contexts/ai-assistance/` ya contiene la implementacion de dominio de la Fase 0 y sus tests unitarios. Las fases de adaptadores, casos de uso, HTTP, persistencia y control de uso siguen pendientes.

### Fase 0 - Dominio

Implementada en la rama actual:

- Value objects: `SuggestionId`, `ConfidenceScore`, `MerchantName` y `ReceiptImageRef`.
- `SuggestionStatus` con estados `Pending`, `Confirmed` y `Discarded`.
- Entidades `ExpenseSuggestion`, `ReceiptSuggestion` y `ConfirmedSuggestion`.
- Errores de dominio para sugerencias, proveedor, texto ilegible y recibos ilegibles.
- Entidad `MerchantCategoryHistory` y su repositorio.
- Puertos `NaturalLanguageParserPort`, `ReceiptScannerPort` y `CategoryLookupPort`.
- `SuggestionRepository`.
- Eventos de dominio de AI Assistance.

La implementacion incluye tests unitarios de dominio y dobles in-memory para `SuggestionRepository` y `MerchantCategoryHistoryRepository`.

Continuan pendientes las fases 1 a 6 descritas a continuacion.

### Fase 1 - Adaptadores fake

Implementada en la rama actual:

- `FakeNaturalLanguageParser` deterministico.
- `FakeReceiptScanner` deterministico.

Ambos adaptadores tienen tests de contrato. El parser extrae montos simples, usa CLP, deja la categoria sin resolver y devuelve una sugerencia pendiente. El scanner devuelve un `ReceiptScanResult` neutral derivado de los metadatos de la imagen, sin llamadas externas.

No existe aun un proveedor real de IA integrado. Los adaptadores antiguos de OpenAI y Vision no se reutilizaran.

### Fase 2 - Casos de uso

Parcialmente implementada:

- `ParseNaturalLanguageExpenseUseCase` implementado con tests unitarios.
- `ScanReceiptUseCase` implementado con tests unitarios.
- `ConfirmSuggestionUseCase` implementado con tests unitarios.
- `DiscardSuggestionUseCase` implementado con tests unitarios.

Financial Tracking ya expone `CreateFinancialItemUseCase`, que sera la frontera publica para confirmar una sugerencia.

### Fase 3 - HTTP

Pendiente:

- `POST /families/:familyId/suggestions/text`.
- `POST /families/:familyId/suggestions/receipt`.
- `POST /families/:familyId/suggestions/:suggestionId/confirm`.
- `DELETE /families/:familyId/suggestions/:suggestionId`.

Las rutas deberan aplicar `authenticate` y `requireFamilyMembership`, declarar schemas Fastify y mantener handlers delgados.

`@fastify/multipart` aun no esta instalado y solo sera necesario al implementar la subida multipart de recibos.

### Fase 4 - Persistencia

Pendiente:

- Schema Drizzle para `suggestions`.
- Schema Drizzle para `merchant_category_history`.
- `DrizzleSuggestionRepository`.
- `DrizzleMerchantCategoryHistoryRepository`.
- Migracion correspondiente.
- `buildAiAssistanceModule()`.
- Integracion del modulo en `src/platform/app.ts`.
- Reexport del schema desde `src/platform/db/schema.ts`.

El esquema esta descrito en `docs/integracion-postgresql.md`, pero aun no existe como codigo en `src/`.

### Fase 5 - Casos avanzados

Pendiente de diseno:

- `AskFinancialQuestion`: definir como se traduce una pregunta libre a consultas estructuradas de Reporting.
- `GenerateInsights`: decidir si el MVP usara plantillas deterministicas basadas en Reporting o un proveedor de IA para redactar los resultados.

### Fase 6 - Control de uso

Pendiente y no bloqueante para el flujo principal:

- Rate limiting o control de costos de las operaciones que llamen a IA.

## Divergencias documentales que deben resolverse

### Historial comercio-categoria

El plan actual establece que `ConfirmSuggestionUseCase` actualizara directamente `MerchantCategoryHistory`, porque ese caso de uso ya conoce el comercio, la categoria confirmada y el contexto de la sugerencia.

La documentacion de casos de uso todavia describe un `OnItemRecordedHandler` que aprende desde el evento `ItemRecorded`. Estas dos estrategias no deben implementarse simultaneamente sin una razon clara.

Decision para la implementacion inicial: actualizar el historial de forma sincrona desde `ConfirmSuggestionUseCase`. Esto evita modificar `ItemRecorded` para introducir conceptos de AI Assistance y mantiene el acoplamiento entre contextos en el caso de uso publico de Financial Tracking.

### Contrato hacia Financial Tracking

`CategoryLookupPort` debe definirse dentro de AI Assistance. Su adaptador de composicion puede delegar en una query publica de Financial Tracking, sin importar infraestructura ni entidades internas desde el dominio de AI Assistance.

La confirmacion seguira la misma regla: AI Assistance llamara a `CreateFinancialItemUseCase` y no escribira directamente en el dominio financiero.

### Esquema de persistencia

El esquema documentado de AI Assistance debe convertirse en un archivo real dentro de:

`src/contexts/ai-assistance/infrastructure/persistence/schema.ts`

Antes de generar la migracion hay que revisar los imports y restricciones del ejemplo documental, incluido el uso de `integer` en `merchant_category_history`.

## Requisitos de implementacion

- Aplicar TDD: primero tests unitarios que fallen, despues implementacion minima y finalmente refactor.
- Usar `node:test` y `node:assert/strict`.
- Mantener imports internos con extension `.js`.
- Mantener el dominio independiente de infraestructura.
- No agregar un proveedor real de IA en esta fase.
- No reutilizar ni copiar codigo de `feature/ai-assistance`.
- Actualizar `docs/uses-cases/` cuando se implemente cada caso de uso.
- Mantener la filosofia: la IA propone y el usuario confirma.
- Un recibo produce exactamente una sugerencia y, tras confirmacion, un unico `FinancialItem`.

## Estado de validacion de `main`

En la revision inicial del estado actual:

- `npm test`: 828 tests pasan.
- `npm run build`: pasa.
- `npm run lint`: pasa.
- Tests especificos de AI Assistance: aun no existen.

Estas validaciones confirman la salud del codigo existente, pero no representan cobertura del contexto AI Assistance hasta que se agreguen sus tests.

## Orden acordado

1. Implementar Fase 0 con tests de dominio.
2. Implementar los adaptadores fake de la Fase 1.
3. Implementar los cuatro casos de uso core de la Fase 2.
4. Implementar las rutas HTTP.
5. Implementar persistencia y composicion.
6. Resolver y construir `AskFinancialQuestion` y `GenerateInsights` despues de cerrar sus decisiones de diseno.
7. Abordar rate limiting como trabajo transversal no bloqueante.
