# Plan de implementación de endpoints HTTP

Orden lógico para exponer, vía Fastify, los casos de uso ya diseñados (y en su mayoría implementados/testeados a nivel de dominio) en los 5 bounded contexts. El criterio de orden es el mismo que ya usamos para diseñar la comunicación entre contextos: **las dependencias upstream se exponen primero**, porque los contextos downstream las necesitan para funcionar (autenticación, autorización, datos base).

---

## Estado actual (punto de partida)

- **Piezas transversales ya construidas**: `buildApp()`/`AppDependencies`, manejador global de errores (`DomainError` → status HTTP + errores de validación de JSON Schema de Fastify → 400), middleware `authenticate`.
- **Family & Access**: los 9 casos de uso están implementados y testeados a nivel de aplicación. Expuesto por HTTP: solo `POST /families` (`CreateFamily`), con TDD completo incluyendo validación de schema.
- **Financial Tracking, Budgeting, Reporting, AI Assistance**: documentados (casos de uso), con las entidades/value objects centrales implementados, pero **ningún caso de uso de aplicación ni ruta HTTP** todavía.
- **Persistencia**: todo corre sobre repositorios in-memory. La integración con Postgres/Drizzle está documentada pero no implementada (bloqueada por el patrón `reconstitute()` pendiente).

---

## Principio a replicar en cada endpoint nuevo

Para mantener consistencia, cada endpoint nuevo sigue el mismo checklist, ya validado con `POST /families`:

1. **Test de integración primero** (TDD): `fastify.inject()` con dependencias en memoria, cubriendo el camino feliz, al menos un error de dominio relevante, y autenticación/autorización si aplica.
2. **Definir el JSON Schema** del body/params/querystring en la propia ruta (evita validación manual repetida).
3. **`preHandler`**: `authenticate` siempre; `requireFamilyMembership(getFamilyMembershipQuery, minRole?)` en cualquier ruta que opere sobre datos de una familia específica.
4. **El handler solo orquesta**: arma el command/query desde `request`, llama al caso de uso ya existente, mapea el resultado a DTO de respuesta. Ninguna lógica de negocio nueva vive aquí.
5. **Registrar la ruta** en el archivo `*.routes.ts` del contexto correspondiente, y sus dependencias en `AppDependencies`/`buildApp()`.

---

## Fase 0 — Cerrar piezas transversales que van a repetirse mucho

Antes de escalar a docenas de endpoints, resolver esto evita repetir el mismo problema muchas veces:

1. **Helper de registro de dependencias por contexto**: hoy `buildApp()` ya empieza a verse recargado con la construcción manual de cada caso de uso. Antes de agregar los ~13 casos de uso restantes de `Family & Access` más los de los otros 4 contextos, conviene un patrón de composición más escalable (ej. una función `buildFamilyAccessModule(deps)` que devuelva todos los casos de uso ya construidos, en vez de instanciarlos todos sueltos dentro de `buildApp()`).
2. **`requireFamilyMembership` conectado de verdad**: ya está escrito, pero `POST /families` no lo necesita (se crea una familia nueva, no hay membresía previa que validar). Es el primer endpoint downstream (ver Fase 1) el que realmente lo va a ejercitar por primera vez con un test real — buen punto de control para confirmar que funciona end-to-end.
3. **Confirmar el criterio de permisos pendiente**: varios documentos de casos de uso (`Financial Tracking`, `Budgeting`) dejaron abierto si las acciones requieren `Owner` o cualquier `Member`. Antes de exponer esos endpoints, conviene resolverlo — cambia qué `minRole` se pasa a `requireFamilyMembership` en cada ruta.

---

## Fase 1 — Completar `Family & Access`

Es el contexto **upstream** de todo — sin poder invitar/gestionar miembros, no tiene sentido avanzar a `Financial Tracking` (que ya requiere autorización por familia en cada request). Orden sugerido dentro de la fase:

1. `GET /families/:familyId/members` (`GetFamilyMembers`) — el primer endpoint que ejercita `requireFamilyMembership` de verdad. Simple (solo lectura), buen punto de control.
2. `POST /families/:familyId/invitations` (`InviteMember`) — requiere `minRole: Owner`.
3. `POST /invitations/:invitationId/accept` (`AcceptInvitation`) — nota: esta ruta **no** cuelga de `/families/:familyId/...`, porque quien acepta todavía no es miembro de la familia (no puede pasar `requireFamilyMembership`). Solo necesita `authenticate`.
4. `DELETE /invitations/:invitationId` (`RevokeInvitation`) — mismo caso, sin `requireFamilyMembership` (la autorización se valida dentro del propio caso de uso, contra la familia de la invitación).
5. `DELETE /families/:familyId/members/:memberId` (`RemoveMember`) — `minRole: Owner`.
6. `PATCH /families/:familyId/members/:memberId/role` (`ChangeMemberRole`) — `minRole: Owner`.
7. `PATCH /families/:familyId/settings/currency` (`ChangeDefaultCurrency`) — `minRole: Owner`.
8. `GET /families/:familyId/members/me` o equivalente para `GetFamilyMembership` — en la práctica, este caso de uso ya se usa *internamente* en el middleware; evaluar si además necesita exponerse como endpoint propio (ej. para que el frontend sepa "mi rol en esta familia" al entrar a la app) o si alcanza con lo que ya devuelve el login/token.

---

## Fase 2 — `Financial Tracking` (el core domain)

Depende de Fase 1 porque cada request necesita `requireFamilyMembership`. Dentro de la fase, **categorías y tags antes que items**, porque `CreateFinancialItem` valida contra una categoría existente:

1. `POST /families/:familyId/categories` (`CreateCategory`).
2. `GET /families/:familyId/categories` (`GetCategories`).
3. `POST /families/:familyId/categories/:categoryId/tags` (`AddTagToCategory`).
4. `PATCH /families/:familyId/categories/:categoryId` (`RenameCategory`).
5. `PATCH /families/:familyId/categories/:categoryId/tags/:tagId` (`RenameTag`).
6. `PUT /families/:familyId/categories/:categoryId/tags/order` (`ReorderCategoryTags`).
7. `POST /families/:familyId/categories/:categoryId/deprecate` (`DeprecateCategory`).
8. `POST /families/:familyId/categories/:categoryId/tags/:tagId/deprecate` (`DeprecateTag`).
9. `DELETE /families/:familyId/categories/:categoryId` (`DeleteCategory`).
10. `DELETE /families/:familyId/categories/:categoryId/tags/:tagId` (`DeleteTag`).
11. `POST /families/:familyId/items` (`CreateFinancialItem`) — el endpoint más importante de todo el backend; requiere resolver antes el pendiente de `Currency` por defecto de la familia.
12. `GET /families/:familyId/items` (`GetFinancialItems`, con filtros vía querystring).
13. `PATCH /families/:familyId/items/:itemId` (`UpdateFinancialItem`).
14. `PATCH /families/:familyId/items/:itemId/category` (`ReclassifyFinancialItem`) — ruta separada de la anterior, según la decisión ya tomada.
15. `DELETE /families/:familyId/items/:itemId` (`DeleteFinancialItem`).

---

## Fase 3 — `Budgeting`

Depende de Fase 2 porque `CreateBudgetConfiguration` valida contra categorías existentes, y sus event handlers reaccionan a eventos que recién existen cuando hay items reales creándose:

1. **Antes de cualquier ruta**: conectar los 4 event handlers (`OnItemRecordedHandler` y los otros 3) al `EventBus`, y verificar con un test de integración que crear un item vía HTTP efectivamente actualiza un `BudgetPeriodStatus` — este es el primer punto donde se prueba la comunicación asíncrona entre contextos de punta a punta.
2. `POST /families/:familyId/budgets` (`CreateBudgetConfiguration`).
3. `GET /families/:familyId/budgets` (`GetBudgets`, con `period` opcional en querystring).
4. `PATCH /families/:familyId/budgets/:budgetConfigurationId` (`UpdateDefaultBudgetAmount`).
5. `PUT /families/:familyId/budgets/:budgetConfigurationId/overrides/:period` (`SetBudgetOverrideForPeriod`).
6. `DELETE /families/:familyId/budgets/:budgetConfigurationId/overrides/:period` (`RemoveBudgetOverrideForPeriod`).
7. `POST /families/:familyId/budgets/:budgetConfigurationId/deactivate` (`DeactivateBudgetConfiguration`).

---

## Fase 4 — `Reporting`

Puramente de lectura; depende de que Fase 2 (y opcionalmente Fase 3) ya estén generando datos reales para que las queries tengan algo que mostrar:

1. Conectar los event handlers de `Reporting` al `EventBus` (mismo patrón de verificación que en Fase 3, paso 1).
2. `GET /families/:familyId/dashboard` (`GetDashboardSummary`).
3. `GET /families/:familyId/reports/breakdown` (`GetCategoryBreakdown`).
4. `GET /families/:familyId/reports/comparison` (`GetPeriodComparison`).
5. `GET /families/:familyId/reports/trend` (`GetTrend`).
6. `GET /families/:familyId/reports/drilldown` (`GetDrillDown`).

---

## Fase 5 — `AI Assistance`

Al final porque depende funcionalmente de `Financial Tracking` (para confirmar sugerencias) y de `Reporting` (para `GenerateInsights`/`AskFinancialQuestion`) — y porque es el contexto con más pendientes de diseño sin resolver (puertos de IA aún no implementados con un proveedor real):

1. Implementar al menos un adaptador real (o uno "fake" determinístico para desarrollo) de `NaturalLanguageParserPort` y `ReceiptScannerPort`, ya que sin esto los endpoints no tienen nada real que hacer.
2. `POST /families/:familyId/suggestions/text` (`ParseNaturalLanguageExpense`).
3. `POST /families/:familyId/suggestions/receipt` (`ScanReceipt`, con manejo de upload de imagen — a definir mecanismo, probablemente `multipart/form-data`).
4. `POST /families/:familyId/suggestions/:suggestionId/confirm` (`ConfirmSuggestion`).
5. `DELETE /families/:familyId/suggestions/:suggestionId` (`DiscardSuggestion`).
6. `POST /families/:familyId/assistant/ask` (`AskFinancialQuestion`) — el más pendiente de diseño de todo el catálogo; probablemente el último en implementarse en la práctica.
7. `GET /families/:familyId/insights` (`GenerateInsights`).

---

## Resumen visual del orden de fases

```
Fase 0 (transversal)
   │
   ▼
Fase 1: Family & Access ──────────► ancla de autorización para todo lo demás
   │
   ▼
Fase 2: Financial Tracking ───────► core domain, genera los eventos que consumen 3 y 4
   │
   ├──────────────┐
   ▼              ▼
Fase 3: Budgeting   Fase 4: Reporting     ← pueden desarrollarse en paralelo entre sí,
   │              │                          ambas dependen solo de Fase 2
   └──────┬───────┘
          ▼
Fase 5: AI Assistance   ← depende de 2 (confirmar) y 4 (insights/preguntas)
```

## Nota sobre paralelismo

Si en algún momento se distribuye el trabajo (aunque sea entre sesiones distintas, no necesariamente entre personas), `Budgeting` y `Reporting` (Fases 3 y 4) son independientes entre sí — ambas solo dependen de que `Financial Tracking` (Fase 2) esté publicando eventos reales. No hace falta terminar una completamente antes de empezar la otra.
