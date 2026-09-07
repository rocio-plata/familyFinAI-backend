# Plan de implementación de endpoints HTTP

Orden lógico para exponer, vía Fastify, los casos de uso ya diseñados (y en su mayoría implementados/testeados a nivel de dominio) en los 6 bounded contexts (incluyendo `Identity`, agregado después de la primera versión de este plan). El criterio de orden es el mismo que ya usamos para diseñar la comunicación entre contextos: **las dependencias upstream se exponen primero**, porque los contextos downstream las necesitan para funcionar (autenticación, autorización, datos base).

---

## Estado actual (punto de partida)

- **Piezas transversales ya construidas**: `buildApp()`/`AppDependencies`, manejador global de errores (`DomainError` → status HTTP + errores de validación de JSON Schema de Fastify → 400), middleware `authenticate`, `buildFamilyAccessModule()` (helper de composición por contexto).
- **Identity** (contexto nuevo, upstream de todo): casos de uso implementados y testeados a nivel de aplicación — `RegisterUser`, `Login`, `GetUserProfile`, `UpdateDisplayName`, `ChangePassword`, `GetUserIdByEmail` (query interna, ya integrada vía `IdentityUserDirectoryAdapter`, wireada en `server.ts`, no se expone por HTTP). Existe el workflow de composición `RegisterUserWithPersonalFamilyWorkflow` (`platform/workflows/`), que orquesta `RegisterUser` + `CreateFamily`. `buildIdentityModule()` ✅ implementado. Rutas expuestas: `POST /auth/register` ✅, `POST /auth/login` ✅, `GET /me/profile` ✅, `PATCH /me/display-name` ✅ y `PATCH /me/password` ✅.
- **`platform/auth`**: `JwtService`, `TokenService` (con rotación y detección de robo) y `RefreshToken` están implementados y expuestos vía `POST /auth/refresh` ✅ y `POST /auth/logout` ✅. Las rutas viven en `auth.module.ts`, que agrupa la composición HTTP transversal de autenticación.
- **Family & Access**: los 9 casos de uso originales están implementados, testeados y **expuestos por HTTP** (`POST /families`, `GET /families/:familyId/members`, `POST /families/:familyId/invitations`, `POST /invitations/:invitationId/accept`, `DELETE /invitations/:invitationId`, `DELETE /families/:familyId/members/:memberId`, `PATCH /families/:familyId/members/:memberId/role`, `PATCH /families/:familyId/settings/currency`, `GET /families/:familyId/members/me`), todos con TDD completo. Además, ya se implementó la extensión multi-familia a nivel de aplicación (`GetFamiliesForUser`, `ReorderMyFamilies`, `displayOrder` en `Member`) — **sin ruta HTTP todavía**.
- **Financial Tracking**: casos de uso y entidades/value objects centrales implementados; `POST /families/:familyId/categories` ✅, `GET /families/:familyId/categories` ✅, `POST /families/:familyId/categories/:categoryId/tags` ✅, `PATCH /families/:familyId/categories/:categoryId` ✅, `PATCH /families/:familyId/categories/:categoryId/tags/:tagId` ✅, `PUT /families/:familyId/categories/:categoryId/tags/order` ✅, `POST /families/:familyId/categories/:categoryId/deprecate` ✅, `POST /families/:familyId/categories/:categoryId/tags/:tagId/deprecate` ✅, `DELETE /families/:familyId/categories/:categoryId` ✅, `DELETE /families/:familyId/categories/:categoryId/tags/:tagId` ✅ y `POST /families/:familyId/items` ✅ son los primeros endpoints expuestos. **Budgeting, Reporting y AI Assistance**: documentados, con sus entidades/value objects centrales implementados, pero sin rutas HTTP todavía.
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

1. ~~**Helper de registro de dependencias por contexto**: ya resuelto para `Family & Access` (`buildFamilyAccessModule()`). Falta el análogo `buildIdentityModule()` antes de exponer las rutas de la Fase 1.~~ ✅ `buildIdentityModule()` implementado.
2. **`requireFamilyMembership` conectado de verdad**: ✅ confirmado end-to-end con los endpoints de `Family & Access` (Fase 2).
3. **Confirmar el criterio de permisos pendiente**: varios documentos de casos de uso (`Financial Tracking`, `Budgeting`) dejaron abierto si las acciones requieren `Owner` o cualquier `Member`. Antes de exponer esos endpoints, conviene resolverlo — cambia qué `minRole` se pasa a `requireFamilyMembership` en cada ruta. `Financial Tracking` ya quedó resuelto en su documento de casos de uso; `Budgeting` sigue pendiente de diseño.
4. ~~**`EmailAddress` movida a `shared-kernel`**~~ ✅: `EmailAddress` e `InvalidEmailError` ahora viven en `shared-kernel` y son consumidos por `Family & Access` e `Identity`.

---

## Fase 1 — `Identity` (nuevo contexto, upstream de todo)

Hasta ahora, obtener un token válido para probar los endpoints de `Family & Access` requería un script manual (`npm run token`). Este contexto resuelve el flujo real: sin él no existe una forma legítima de que un usuario obtenga su primer token. Por eso, en términos de dependencias, debería haberse expuesto **antes** que `Family & Access` — se documenta ahora en su posición lógica, aunque en la práctica `Family & Access` ya se implementó primero (usando tokens generados manualmente para las pruebas).

0. ~~`buildIdentityModule()`~~ ✅ — mismo patrón que `buildFamilyAccessModule()` (Fase 0, punto 1).
1. ~~`POST /auth/register`~~ ✅ — invoca el workflow `RegisterUserWithPersonalFamilyWorkflow`, **no** `RegisterUserUseCase` directamente (ver `docs/identity-y-multi-familia.md`). No requiere `authenticate`.
2. ~~`POST /auth/login` (`Login`)~~ ✅. No requiere `authenticate`.
3. ~~`GET /me/profile` (`GetUserProfile`)~~ ✅ — requiere `authenticate`, sin `requireFamilyMembership` (no depende de una familia específica).
4. ~~`PATCH /me/display-name` (`UpdateDisplayName`)~~ ✅ — requiere `authenticate`, sin `requireFamilyMembership`.
5. ~~`PATCH /me/password` (`ChangePassword`)~~ ✅ — requiere `authenticate`.
6. ~~`POST /auth/refresh` (`TokenService.refresh`)~~ ✅ — rota el token normalmente y devuelve `401` para tokens inválidos o reusados. No requiere `authenticate` (el propio refresh token es la credencial).
7. ~~`POST /auth/logout` (`TokenService.revokeAll`)~~ ✅ — requiere `authenticate` como preHandler y revoca todas las sesiones del usuario.

**Nota de composición**: las rutas transversales de los puntos 6 y 7 se agrupan en `platform/auth/auth.module.ts`; `TokenService` solo trabaja con `UserId`, sin acoplarse al contexto Identity.

**Nota**: `GetUserIdByEmail` no se expone por HTTP — es una query interna que ya consume `Family & Access` vía `IdentityUserDirectoryAdapter`.

---

## Fase 2 — Completar `Family & Access`

Es el contexto **upstream** del resto de los datos de negocio — sin poder invitar/gestionar miembros, no tiene sentido avanzar a `Financial Tracking` (que ya requiere autorización por familia en cada request). Los **11 casos de uso** (9 originales + 2 de la extensión multi-familia) ya están expuestos por HTTP:

1. ~~`GET /families/:familyId/members` (`GetFamilyMembers`)~~ ✅
2. ~~`POST /families/:familyId/invitations` (`InviteMember`)~~ ✅
3. ~~`POST /invitations/:invitationId/accept` (`AcceptInvitation`)~~ ✅
4. ~~`DELETE /invitations/:invitationId` (`RevokeInvitation`)~~ ✅
5. ~~`DELETE /families/:familyId/members/:memberId` (`RemoveMember`)~~ ✅
6. ~~`PATCH /families/:familyId/members/:memberId/role` (`ChangeMemberRole`)~~ ✅
7. ~~`PATCH /families/:familyId/settings/currency` (`ChangeDefaultCurrency`)~~ ✅
8. ~~`GET /families/:familyId/members/me` (`GetFamilyMembership`)~~ ✅
9. ~~`GET /me/families` (`GetFamiliesForUser`)~~ ✅ — lista todas las familias del usuario autenticado, ya ordenadas. Requiere solo `authenticate` (no `requireFamilyMembership`, ya que no opera sobre una familia específica sino sobre todas las del usuario).
10. ~~`PUT /me/families/order` (`ReorderMyFamilies`)~~ ✅ — recibe `orderedFamilyIds` completo y valida que coincida exactamente con las familias reales del usuario. Requiere solo `authenticate`.

---

## Fase 3 — `Financial Tracking` (el core domain)

Depende de Fase 2 porque cada request necesita `requireFamilyMembership`. Dentro de la fase, **categorías y tags antes que items**, porque `CreateFinancialItem` valida contra una categoría existente:

1. ~~`POST /families/:familyId/categories` (`CreateCategory`)~~ ✅ — requiere `authenticate`; el caso de uso valida que quien la crea sea Owner.
2. ~~`GET /families/:familyId/categories` (`GetCategories`)~~ ✅ — requiere `authenticate` y membresía de la familia; admite `includeDeprecated` opcional.
3. ~~`POST /families/:familyId/categories/:categoryId/tags` (`AddTagToCategory`)~~ ✅ — requiere rol Owner; valida categoría activa y evita tags duplicados.
4. ~~`PATCH /families/:familyId/categories/:categoryId` (`RenameCategory`)~~ ✅ — requiere rol Owner y evita nombres duplicados, incluso si la categoría existente está deprecada.
5. ~~`PATCH /families/:familyId/categories/:categoryId/tags/:tagId` (`RenameTag`)~~ ✅ — requiere rol Owner y evita nombres duplicados dentro de la categoría.
6. ~~`PUT /families/:familyId/categories/:categoryId/tags/order` (`ReorderCategoryTags`)~~ ✅ — requiere rol Owner y valida que el array contenga exactamente los tags actuales de la categoría.
7. ~~`POST /families/:familyId/categories/:categoryId/deprecate` (`DeprecateCategory`)~~ ✅ — requiere rol Owner; la categoría queda oculta del listado predeterminado, pero permanece disponible con `includeDeprecated=true`.
8. ~~`POST /families/:familyId/categories/:categoryId/tags/:tagId/deprecate` (`DeprecateTag`)~~ ✅ — requiere rol Owner y conserva el tag deprecado en la categoría.
9. ~~`DELETE /families/:familyId/categories/:categoryId` (`DeleteCategory`)~~ ✅ — requiere rol Owner y rechaza la eliminación si la categoría tiene items asociados.
10. ~~`DELETE /families/:familyId/categories/:categoryId/tags/:tagId` (`DeleteTag`)~~ ✅ — requiere rol Owner y rechaza la eliminación si el tag tiene items asociados.
11. ~~`POST /families/:familyId/items` (`CreateFinancialItem`)~~ ✅ — requiere membresía de la familia; resuelve `currency` desde la moneda predeterminada de la familia cuando no se indica y permite un override explícito.
12. `GET /families/:familyId/items` (`GetFinancialItems`, con filtros vía querystring).
13. `PATCH /families/:familyId/items/:itemId` (`UpdateFinancialItem`).
14. `PATCH /families/:familyId/items/:itemId/category` (`ReclassifyFinancialItem`) — ruta separada de la anterior, según la decisión ya tomada.
15. `DELETE /families/:familyId/items/:itemId` (`DeleteFinancialItem`).

---

## Fase 4 — `Budgeting`

Depende de Fase 3 porque `CreateBudgetConfiguration` valida contra categorías existentes, y sus event handlers reaccionan a eventos que recién existen cuando hay items reales creándose:

1. **Antes de cualquier ruta**: conectar los 4 event handlers (`OnItemRecordedHandler` y los otros 3) al `EventBus`, y verificar con un test de integración que crear un item vía HTTP efectivamente actualiza un `BudgetPeriodStatus` — este es el primer punto donde se prueba la comunicación asíncrona entre contextos de punta a punta.
2. `POST /families/:familyId/budgets` (`CreateBudgetConfiguration`).
3. `GET /families/:familyId/budgets` (`GetBudgets`, con `period` opcional en querystring).
4. `PATCH /families/:familyId/budgets/:budgetConfigurationId` (`UpdateDefaultBudgetAmount`).
5. `PUT /families/:familyId/budgets/:budgetConfigurationId/overrides/:period` (`SetBudgetOverrideForPeriod`).
6. `DELETE /families/:familyId/budgets/:budgetConfigurationId/overrides/:period` (`RemoveBudgetOverrideForPeriod`).
7. `POST /families/:familyId/budgets/:budgetConfigurationId/deactivate` (`DeactivateBudgetConfiguration`).

---

## Fase 5 — `Reporting`

Puramente de lectura; depende de que Fase 3 (y opcionalmente Fase 4) ya estén generando datos reales para que las queries tengan algo que mostrar:

1. Conectar los event handlers de `Reporting` al `EventBus` (mismo patrón de verificación que en Fase 3, paso 1).
2. `GET /families/:familyId/dashboard` (`GetDashboardSummary`).
3. `GET /families/:familyId/reports/breakdown` (`GetCategoryBreakdown`).
4. `GET /families/:familyId/reports/comparison` (`GetPeriodComparison`).
5. `GET /families/:familyId/reports/trend` (`GetTrend`).
6. `GET /families/:familyId/reports/drilldown` (`GetDrillDown`).

---

## Fase 6 — `AI Assistance`

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
Fase 1: Identity ─────────────────► emite el primer token real (registro/login)
   │
   ▼
Fase 2: Family & Access ──────────► ancla de autorización para todo lo demás
   │
   ▼
Fase 3: Financial Tracking ───────► core domain, genera los eventos que consumen 4 y 5
   │
   ├──────────────┐
   ▼              ▼
Fase 4: Budgeting   Fase 5: Reporting     ← pueden desarrollarse en paralelo entre sí,
   │              │                          ambas dependen solo de Fase 3
   └──────┬───────┘
          ▼
Fase 6: AI Assistance   ← depende de 3 (confirmar) y 5 (insights/preguntas)
```

## Nota sobre paralelismo

Si en algún momento se distribuye el trabajo (aunque sea entre sesiones distintas, no necesariamente entre personas), `Budgeting` y `Reporting` (Fases 4 y 5) son independientes entre sí — ambas solo dependen de que `Financial Tracking` (Fase 3) esté publicando eventos reales. No hace falta terminar una completamente antes de empezar la otra.
