# Plan de implementación: brechas del backend para la app móvil (v3)

> **Estado: decisiones cerradas el 13-oct-2026.** Todas las decisiones de la sección 1 están confirmadas; el plan se puede implementar sin ambigüedades.

Cierra las brechas de la sección 6 de `api-contract.md`. Método: **TDD** (test primero), el handler solo orquesta, la lógica vive en dominio y aplicación, y cada paso termina con el contrato y Postman actualizados.

> **Qué cambió respecto a la v2.** Tus reglas de moneda simplifican los reportes: como una familia solo puede tener items en **su** moneda, ya no hace falta devolver un bloque por moneda. A cambio aparecen una **regla de moneda de la familia** (Fase 1) y un **modelo de dinero exacto en unidades menores** (Fase 0), que resuelve el problema de los decimales de USD y EUR.

> **Cómo leer las decisiones.** La sección 1 reúne tus decisiones (1.1), las que se tomaron por defecto y quedaron aprobadas (1.2) y las 6 consultas, ya confirmadas con la opción recomendada (1.3). La columna "Impacto si eliges otra" se conserva solo como registro de las alternativas descartadas.

---

## 1. Decisiones

### 1.1 Tomadas por ti

| # | Decisión | Regla concreta |
| :--: | --- | --- |
| **D1** | Formato de dinero unificado | Toda cifra de dinero en una **respuesta** es un objeto `Money` `{ "amount", "currency" }`. Las variaciones porcentuales y `percentage` no son dinero |
| **D2** | Una familia = una moneda; no se suman monedas distintas | Ver reglas C1–C4 abajo |
| **D9** | Los decimales de USD y EUR se resuelven **ya** | El dinero se maneja como **enteros en la unidad menor** de cada moneda (ver Fase 0.2). Nada de `number` con decimales en dominio, base de datos ni reportes |

**Reglas de moneda de la familia (D2 desarrollada):**

| Regla | Enunciado |
| :--: | --- |
| **C1** | Todo item usa la moneda por defecto de la familia. Si la petición trae `currency` y es distinta → `SHARED.CURRENCY_MISMATCH` (409). Lo mismo aplica a presupuestos y a la confirmación de sugerencias de IA |
| **C2** | La moneda por defecto **solo puede cambiarse si la familia no tiene items** (ni presupuestos activos, ver Q2). Si los tiene → `FAMILY.CURRENCY_LOCKED` (409) |
| **C3** | Si se borran todos los items, la moneda vuelve a poder cambiarse. No hay estado "bloqueada para siempre": se calcula en el momento contando items |
| **C4** | Cambiar a la misma moneda que ya tiene la familia es una operación sin efecto (`204`), aunque haya items |

**Consecuencia para los reportes:** como los items de una familia solo existen en su moneda, **todos los reportes devuelven una única `currency`** a nivel superior. Desaparecen `currencies[]`, el filtro `currency`, `availableCurrencies` y la lógica de bloques por moneda de la v2.

### 1.2 Decididas por defecto (✅ aprobadas)

| # | Decisión | Elegida |
| :--: | --- | --- |
| P1 | Reemplazar `dashboard.categoryBreakdown` | **Sí**, sin mantener compatibilidad: no hay clientes |
| P2 | Rechazo de invitación (A2) | Estado nuevo `DECLINED` (no se reutiliza `REVOKED`) |
| P3 | Declinar una invitación vencida | Error `FAMILY.INVITATION_EXPIRED`, igual que `accept` |
| P4 | Quién puede revocar una invitación | **OWNER de la familia de la invitación** (quien la creó y ya no es OWNER, no) |
| P5 | Email de los miembros (A4) | Visible solo para OWNER; `displayName` para todos |
| P6 | Caducidad de sugerencias de IA (S7) | 24 horas |
| P7 | Dependencia para multipart (S9) | `@fastify/multipart` (excepción documentada a "pocas dependencias") |
| P8 | Campo `currency` en peticiones de items y presupuestos | **Se mantiene opcional**; si viene, debe coincidir con la familia (C1). La regla "si envías `amount` debes enviar `currency`" **desaparece** |
| P9 | Sugerencia de IA cuya moneda ya no coincide con la familia | Al confirmar → `SHARED.CURRENCY_MISMATCH`. No se publica evento nuevo ni se descartan solas |
| P10 | Carrera entre crear un item y cambiar la moneda | **Riesgo aceptado**: existe `UnitOfWork`, pero `ChangeDefaultCurrencyUseCase` todavía no integra la comprobación de actividad financiera y el cambio en una transacción atómica. Se documenta y se prueba la regla a nivel secuencial |
| P11 | Rango máximo de `trend` | 24 meses |
| P12 | Redondeo de `percentage` | Un decimal, calculado con enteros (`round(parte × 1000 / total) / 10`) |
| P13 | Redondeo de variaciones | Dos decimales; `null` si el período base es 0 |
| P14 | Devolver las sugerencias de IA consumidas por error de validación | Una llamada que falla por texto o recibo ilegible **no consume cupo**; sí consume si llegó al proveedor |
| P15 | Sugerencias resueltas por `MerchantCategoryHistory` | **No consumen** cupo de IA |
| P16 | Datos de desarrollo existentes | `db:reset` (ya acordado): se pierden items en otras monedas |

### 1.3 Consultas (✅ confirmadas con la opción recomendada)

Se adoptó la opción **recomendada** en cada una.

| # | Decisión | Opciones | Elegida (recomendación) | Impacto de las alternativas descartadas |
| :--: | --- | --- | --- | --- |
| **Q1** | **Cómo viaja el dinero por la API** (peticiones y respuestas) | (a) Entero en la unidad menor: `1599` = US$ 15,99 · (b) Cadena decimal: `"15.99"` · (c) Número con decimales: `15.99` | **(a)**. Sin flotantes en ningún punto. Para CLP no cambia nada (exponente 0). La app obtiene los decimales con `java.util.Currency.getDefaultFractionDigits()` (CLP 0, USD 2, EUR 2) | (b): el DTO `Money` usa `amount: string` y el esquema valida con regex por moneda; la app usa `BigDecimal`. (c): se vuelve a introducir el riesgo de redondeo en el borde |
| **Q2** | **¿Qué bloquea el cambio de moneda además de los items?** | (a) Solo items · (b) Items **y presupuestos activos** · (c) Items y cualquier presupuesto (activo o no) | **(b)**. Un presupuesto de 200.000 en CLP no significa nada en USD; y como no existe "reactivar", los presupuestos desactivados no molestan | (a): hay que decidir qué pasa con los presupuestos tras el cambio (¿reinterpretar el número? mala idea). (c): un presupuesto desactivado bloquearía la moneda para siempre |
| **Q3** | **Zona horaria para asignar un movimiento a un mes** | (a) Fija `America/Santiago` (variable de entorno) · (b) UTC · (c) Por familia (campo nuevo) | **(a)**. Un gasto del 31-oct a las 23:30 en Chile ya es 1-nov en UTC y caería en el mes equivocado. Se implementa con `Intl.DateTimeFormat`, sin dependencias | (b): más simple pero los meses salen desfasados 3 h. (c): más correcto a futuro, añade un campo y una pantalla de ajustes |
| **Q4** | **Paginación del listado de movimientos** | (a) `limit` + cursor opaco, respuesta `{ items, nextCursor }` · (b) `limit` + `offset`, respuesta arreglo · (c) Cursor en header `X-Next-Cursor`, respuesta arreglo | **(a)**: estable ante inserciones mientras se pagina. Cambia la forma de la respuesta (de arreglo a objeto), que es aceptable porque no hay cliente | (b): más fácil de implementar y testear, pero puede repetir o saltar items si se registran movimientos mientras se pagina. (c): no rompe la forma pero los headers son más incómodos en Ktor |
| **Q5** | **Límite diario de IA y su reinicio** | Cupo y hora de reinicio | **30 sugerencias por usuario y día**, reinicio a medianoche en `America/Santiago`, ambos configurables por entorno | Solo cambian dos variables de entorno |
| **Q6** | **¿Se devuelve el estado de bloqueo de moneda a la app?** | (a) Sí: `GET /families/:id/settings` con `currencyLocked` y los motivos · (b) No, la app descubre el bloqueo al recibir `FAMILY.CURRENCY_LOCKED` | **(a)**: la pantalla de ajustes puede deshabilitar el selector con una explicación en vez de fallar | (b): una ruta menos, peor experiencia |

---

## 2. Principios (heredados)

1. **Test de integración primero** con `fastify.inject()` y dobles in-memory: camino feliz, un error de dominio relevante y autenticación/autorización.
2. **JSON Schema** en cada ruta (body, params, querystring).
3. **Entre contextos solo por puertos** (Anticorruption Layer).
4. **Cada paso termina** con: tests en verde → `api-contract.md` actualizado → Postman al día. La colección ya contiene todas las peticiones del plan, marcadas `[F0]`…`[F5]`: al cerrar una fase solo hay que subir `lastPhaseDone` en el environment (ver el apartado de fases de la descripción de la colección).
5. **Dinero siempre exacto:** ninguna operación aritmética sobre dinero usa números con decimales.

---

## 3. Orden de fases

```
Fase 0  Transversal            ─► errores 401/403 con código · dinero exacto (unidades menores) y formato Money
Fase 1  Moneda de la familia   ─► reglas C1–C4 · bloqueo del cambio · GET settings
Fase 2  Invitaciones y miembros (A1–A6)  ─► features family-selector y family-management
Fase 3  Dashboard y reportes (B1–B8)     ─► features dashboard y reports  (+ zona horaria de períodos)
Fase 4  Movimientos (I1–I3)              ─► feature financial-items
Fase 5  Sugerencias de IA (S1–S9)        ─► features ai-text-entry y ai-receipt-entry
```

Las Fases 0 y 1 van primero porque todo lo demás depende de la forma del dinero y de la regla de moneda.

---

## Fase 0 — Transversal

### 0.1 Errores 401/403 con código (T1) — Resuelto

**Objetivo:** que `authenticate` y `requireFamilyMembership` respondan como los errores de dominio: `{ "error": "AUTH.MISSING_TOKEN", "message": "..." }`.

> **Estado actual:** los middlewares lanzan errores de dominio, `resolveHttpStatus` los mapea a
> 401/403 y `registerErrorHandler` serializa `{ error, message }`. La renovación de sesión se
> documenta por separado.

Los pasos históricos de esta subsección describen cómo se llegó al estado actual; no representan
tareas pendientes nuevas.

| Situación | Código | HTTP |
| --- | --- | :--: |
| Sin header `Authorization` | `AUTH.MISSING_TOKEN` | 401 |
| Token inválido o expirado | `AUTH.INVALID_TOKEN` | 401 |
| Usuario no pertenece a la familia | `FAMILY.NOT_A_MEMBER` | 403 |
| Rol insuficiente | `FAMILY.INSUFFICIENT_ROLE` | 403 |

1. **Test (rojo):** ajustar los tests de `authenticate` y `requireFamilyMembership` para esperar `error` con código y `message`.
2. Reemplazar los `reply.code(...).send({ error: "..." })` por errores de dominio (clases en el apéndice), resueltos por el manejador global.
3. Registrar los códigos en `resolveHttpStatus`.
4. **Unificar** `FINANCIAL.INSUFFICIENT_ROLE` y `FAMILY.INSUFFICIENT_ROLE` en uno solo (`FAMILY.INSUFFICIENT_ROLE`): hoy podrían coexistir con el mismo significado.
5. Ampliar el formato de error para admitir un campo opcional `details` (lo usan `FAMILY.CURRENCY_LOCKED` y `AI.USAGE_LIMIT_EXCEEDED`).
6. Ejecutar todos los tests de rutas existentes: algunos comparan los textos antiguos.

### 0.2 Dinero exacto en unidades menores (T2, D1, D9) — Resuelto en código

**Principio:** el dinero es un **entero** en la unidad menor de su moneda. Nunca hay decimales en dominio, base de datos, reportes ni transporte.

> **Estado actual:** `Money`, `Currency`, la serialización `{ amount, currency }`, la validación de
> importes enteros y la persistencia en unidades menores ya están implementados. Las migraciones
> y el contrato deben seguir reflejando esta forma sin reabrir T2 como brecha funcional.

Los pasos de implementación que siguen son el registro técnico de T2 y no deben interpretarse como
trabajo pendiente, salvo las verificaciones documentales que se indiquen explícitamente.

| Moneda | Exponente | Ejemplo |
| --- | :--: | --- |
| `CLP` | 0 | `25990` = $25.990 |
| `USD` | 2 | `1599` = US$ 15,99 |
| `EUR` | 2 | `1599` = € 15,99 |

**a) Catálogo de monedas (`shared-kernel`)**

1. Ampliar el value object `Currency` con `exponent` (tabla de la izquierda). Añadir una moneda futura = una fila en la tabla.
2. **Tests (rojo):** `Currency.of("CLP").exponent === 0`; `USD` y `EUR` 2; moneda desconocida → `SHARED.UNSUPPORTED_CURRENCY`.

**b) Value object `Money` exacto**

1. Representación: `{ minorUnits: number (entero seguro), currency: Currency }`.
2. API del VO: `Money.ofMinor(n, currency)`, `add`, `subtract`, `isPositive`, `isZero`, `equals`, `toDto()`.
3. **Tests (rojo):**
   - Suma exacta: 10 + 20 = 30 centavos (nunca 0,30000000000000004).
   - Sumar monedas distintas → `SHARED.CURRENCY_MISMATCH`.
   - Rechaza no enteros, `NaN`, `Infinity` y valores fuera de `Number.isSafeInteger` → `SHARED.INVALID_AMOUNT`.
   - Rechaza el monto 0 al **crear un item** (regla de negocio existente: mayor que 0); permite 0 en totales de reportes.
   - `subtract` puede dar negativo (balance).
4. **Cálculos de porcentaje y variación solo con enteros** (P12, P13):
   - `percentage = round(parte × 1000 / total) / 10`, `0` si el total es 0.
   - `variation = round((B − A) × 10000 / A) / 100`, `null` si `A = 0`.

**c) Entrada (peticiones)**

1. Según Q1(a): `amount` es **entero** en unidades menores. JSON Schema: `{ "type": "integer", "minimum": 1 }`. Un `15.99` falla en el esquema con `HTTP.INVALID_REQUEST_BODY`, sin código especial.
2. Aplica a: `POST/PATCH items`, `POST/PATCH budgets`, `PUT overrides`, `confirm` de sugerencias.
3. **Tests (rojo):** `1599` en USD crea un item de US$ 15,99; `15.99` → 400; `"1599"` (cadena) → 400; `0` → 400; negativo → 400.

**d) Salida (respuestas): formato `Money`**

```json
{ "amount": 1599, "currency": "USD" }
```

| Respuesta | Antes | Después |
| --- | --- | --- |
| `POST/GET/PATCH .../items`, reclassify | `amount: 25990, currency: "CLP"` | `amount: { amount: 25990, currency: "CLP" }` (se elimina `currency` de primer nivel) |
| `POST .../suggestions/text` y `receipt` | `amount` + `currency` planos | `amount: Money` |
| `by-payment-method`, `breakdown` | `amount` + `currency` planos | `amount: Money` |
| `dashboard`, `comparison`, `trend` | `balance: number` | `balance: Money` |
| Presupuestos | ya son `Money` | sin cambios (los enteros pasan a ser unidades menores) |
| Drilldown nivel `item` | ya es `Money` | sin cambios |

1. **DTO compartido** `toMoneyDto(money)` en `platform/http/money.dto.ts`: única forma de serializar dinero. Ninguna ruta arma `{ amount, currency }` a mano.
2. **Test de contrato:** una prueba que recorre las respuestas de todas las rutas y falla si encuentra una clave `currency` suelta fuera de un objeto `Money`.

**e) Persistencia**

1. Columnas de importe en `bigint` (drizzle `bigint({ mode: "number" })`), renombradas `amount_minor` en items, presupuestos, overrides, read models y sugerencias.
2. Migración con **`db:reset`** (P16). Para CLP los números no cambian; para USD/EUR los datos antiguos con decimales no sobreviven y no hay datos reales.
3. Los repositorios convierten con `Money.ofMinor` en `reconstitute` y con `.minorUnits` al guardar.
4. **Test de repositorio (con Postgres local):** guardar y leer un item de US$ 15,99 devuelve `1599` exacto.

**f) Contrato y cliente**

1. `api-contract.md`: definir `Money`, tabla de exponentes y la regla "el cliente convierte con `Currency.getDefaultFractionDigits()`".
2. Documentar para la app: guardar `Long` + código de moneda; formatear con `BigDecimal.movePointLeft(digits)`; **nunca** usar `Double` para dinero.
3. Postman: items de la carpeta *5* pasan a validar `amount.amount`.

> Este paso toca muchas rutas. Hacerlo antes de las demás fases evita retrabajo.

---

## Fase 1 — Moneda de la familia (C1–C4)

> **Estado actual:** implementados el puerto de actividad financiera, el bloqueo por items y
> presupuestos activos, `PATCH /families/:familyId/settings/currency`, `GET
> /families/:familyId/settings` y la validación de moneda en items y presupuestos. La confirmación
> de sugerencias de IA y la integración transaccional completa quedan pendientes de sus fases
> específicas.

### 1.1 Puerto de actividad financiera

Family & Access no puede consultar tablas de otros contextos.

1. **Puerto** en Family & Access: `FamilyFinancialActivityPort` con
   - `hasItems(familyId): Promise<boolean>`
   - `hasActiveBudgets(familyId): Promise<boolean>`
2. **Adaptadores:** el primero delega en `FinancialItemRepository.existsByFamilyId`; el segundo en `BudgetConfigurationRepository.existsActiveByFamilyId`. Ambos son consultas `EXISTS`, sin cargar entidades.
3. **Doble in-memory** `FakeFamilyFinancialActivity` con setters para los tests.

### 1.2 `ChangeDefaultCurrency` con bloqueo (C2, C3, C4)

1. **Tests de aplicación (rojo):**
   - Sin items ni presupuestos → cambia la moneda.
   - Con 1 item → `FAMILY.CURRENCY_LOCKED` con `details.reasons: ["ITEMS_EXIST"]`.
   - Con items y presupuesto activo → `reasons: ["ITEMS_EXIST", "ACTIVE_BUDGETS_EXIST"]`.
   - Con presupuesto activo y sin items → bloqueada, `reasons: ["ACTIVE_BUDGETS_EXIST"]`.
   - Con presupuesto **desactivado** y sin items → cambia.
   - Item creado y luego borrado (C3) → cambia.
   - Misma moneda que la actual (C4) → no hace nada y **no consulta** al puerto.
   - Moneda no soportada → `SHARED.UNSUPPORTED_CURRENCY`.
   - Quien llama no es OWNER → 403.
2. `ChangeDefaultCurrencyUseCase` recibe el puerto en su constructor; actualizar `buildFamilyAccessModule` y `buildTestFamilyAccessDependencies`.
3. **Test de ruta:** `PATCH .../settings/currency` → `204`; `409` con `error: "FAMILY.CURRENCY_LOCKED"` y `details.reasons`.
4. La ruta mantiene `requireFamilyMembership(OWNER)`.

### 1.3 Validación en items (C1, P8)

1. **Tests (rojo) sobre `CreateFinancialItem`:**
   - Sin `currency` → usa la moneda de la familia.
   - `currency` igual a la de la familia → ok.
   - `currency` distinta → `SHARED.CURRENCY_MISMATCH` (409).
   - La moneda se obtiene del puerto que ya existe hacia Family & Access (se reutiliza; no se duplica).
2. **`UpdateFinancialItem`:** `currency` opcional. **Se elimina** la regla "si hay `amount` debe haber `currency`". Tests: `amount` solo → ok; `currency` distinta → `SHARED.CURRENCY_MISMATCH`.
3. Ajustar los JSON Schema (ya no hay `dependencies` entre `amount` y `currency`).
4. Postman: eliminar la petición *Update Item con amount sin currency (debe fallar 400)* (deja de ser un error) y añadir una con `currency` distinta que espere 409.

### 1.4 Validación en presupuestos

1. Mismos tests y misma regla en `CreateBudgetConfiguration`, `UpdateDefaultBudgetAmount` y `SetBudgetOverrideForPeriod`: `currency` opcional, debe coincidir (`SHARED.CURRENCY_MISMATCH`).
2. Un presupuesto nace siempre en la moneda de la familia.

### 1.5 Sugerencias de IA (P9)

1. La sugerencia se crea con la moneda de la familia en ese instante.
2. **Tests (rojo):** `confirm` valida igual que un item (C1); si la familia cambió de moneda desde que se generó (solo posible si no hay items) → `SHARED.CURRENCY_MISMATCH`; la app responde descartando la sugerencia.
3. Los detalles del `confirm` se amplían en la Fase 5.

### 1.6 Q6: `GET /families/:familyId/settings`

1. **Respuesta:**

```json
{
  "defaultCurrency": "CLP",
  "currencyLocked": true,
  "currencyLockReasons": ["ITEMS_EXIST"]
}
```

2. **Query** `GetFamilySettingsQuery` reutilizando la misma lógica de `ChangeDefaultCurrency` (extraer un servicio de dominio `CurrencyChangePolicy` que devuelva los motivos; así la consulta y el comando **no pueden divergir**).
3. **Tests (rojo):** familia nueva → `currencyLocked: false`, `[]`; con item → `true`; tras borrar el item → `false`; cualquier miembro puede consultarlo (no solo OWNER).
4. Ruta con `requireFamilyMembership()`.

### 1.7 Carrera (P10)

Entre comprobar "no hay items" y guardar el cambio, otra petición podría crear un item. **Se acepta el riesgo** mientras no exista Unit of Work. Dejar un comentario en el caso de uso con la referencia al pendiente de transacciones y un test que documente el orden secuencial correcto.

### 1.8 Cierre de la fase

- Contrato: reglas C1–C4, `GET settings`, errores nuevos (`SHARED.CURRENCY_MISMATCH`, `FAMILY.CURRENCY_LOCKED`), retirada de la regla `amount`↔`currency`.
- Postman: nueva carpeta *10. Currency rules* con este escenario:

| Paso | Petición | Resultado esperado |
| :--: | --- | --- |
| 1 | Crear familia nueva | 201, CLP |
| 2 | `PATCH currency` a USD | 204 (no hay items) |
| 3 | Crear item de `1599` | 201, `amount: { amount: 1599, currency: "USD" }` |
| 4 | Crear item con `currency: "CLP"` | 409 `SHARED.CURRENCY_MISMATCH` |
| 5 | `GET settings` | `currencyLocked: true`, `["ITEMS_EXIST"]` |
| 6 | `PATCH currency` a EUR | 409 `FAMILY.CURRENCY_LOCKED` |
| 7 | `PATCH currency` a USD (misma) | 204 |
| 8 | Borrar el item | 204 |
| 9 | `PATCH currency` a EUR | 204 |

- Actualizar `casos-de-uso-family-access.md` y `casos-de-uso-financial-tracking.md`.

---

## Fase 2 — Invitaciones y miembros

> **Estado actual:** implementados A1-A6: invitaciones propias, decline, listado administrativo,
> perfiles con `userId`, familias con `defaultCurrency`/`memberCount` y miembros con `displayName`
> y email visible únicamente para `OWNER`. La migración `0010_tiny_may_parker.sql` agrega
> `DECLINED` e `invited_by`. Los DTOs, tests y contratos de esta fase están alineados; BG-03, BG-04
> y BG-05 solo conservan tareas documentales de sincronización.

### 2.1 A6 y A5: perfil y familias

> **BG-02 / A6 — resuelta y retirada del catálogo de brechas:** `GET /me/profile` está protegido
> por `authenticate` y devuelve `userId`, `email`, `displayName` y `createdAt`. La respuesta está
> alineada con `api-contract.md` y `openapi.yaml`; el test HTTP verifica explícitamente que el
> `userId` del perfil coincide con el usuario autenticado.

1. **A5** — `GET /me/families` incluye `defaultCurrency` y `memberCount`.

#### BG-03 / RF-01, RF-02 — `GET /me/families`

> **Estado:** la implementación real ya devuelve los cinco campos y respeta el orden de preferencia
> del usuario. La brecha está en la consistencia documental y en hacer explícito el contrato como
> obligatorio.

**Implementación verificada actualmente:**

- `GetFamiliesForUserQuery` ordena primero por `displayOrder` ascendente; las familias sin orden
  quedan después, ordenadas por `joinedAt`.
- La ruta devuelve `familyId`, `name`, `role`, `defaultCurrency` y `memberCount` para cada familia.
- El test HTTP ya verifica el orden y `familyId`, y el test de aplicación cubre el orden por
  preferencia.
- `api-contract.md` tiene los campos correctos en la primera familia, pero el ejemplo omite
  `defaultCurrency` y `memberCount` en la segunda.
- `openapi.yaml` compone `FamilySummary` desde `Family`, por lo que conserva el identificador
  `id` de `Family` y deja `familyId`, `role` y `memberCount` sin declararlos como obligatorios.

**Cierre de BG-03:**

1. Fijar la respuesta como un array cuyos elementos requieren exactamente estos campos de negocio:
   `familyId`, `name`, `role`, `defaultCurrency` y `memberCount`.
2. Corregir el ejemplo de `api-contract.md` para que todas las familias incluyan los cinco campos.
3. Ajustar `openapi.yaml` para que `FamilySummary` use `familyId` como único identificador y
   marque `familyId`, `name`, `role`, `defaultCurrency` y `memberCount` como `required`; no exponer
   `id` en esta respuesta.
4. Ampliar el test HTTP para afirmar los cinco campos y sus valores en la primera y segunda familia,
   además del orden por preferencia y el array vacío sin familias.
5. Retirar A5 de la tabla de brechas de `api-contract.md` una vez actualizados el contrato y
   OpenAPI.

#### BG-04 — Familia personal garantizada al registrarse

> **Estado:** confirmado para registros exitosos mediante `POST /auth/register`. El workflow de
> composición crea siempre una familia personal llamada `Mis finanzas personales`, asigna al
> usuario como `OWNER` y devuelve su `defaultFamilyId`; por ello, el usuario recién registrado
> tiene al menos una familia para `GET /me/families`.

**Implementación verificada actualmente:**

- `RegisterUserWithPersonalFamilyWorkflow` ejecuta `RegisterUser` y después `CreateFamily` con el
  nombre fijo `Mis finanzas personales`.
- `POST /auth/register` devuelve `defaultFamilyId` junto con `userId`, `email`, `displayName` y
  los tokens.
- La familia personal queda asociada al usuario como `OWNER`.
- Existen tests de workflow y de ruta que verifican la creación, el nombre y la asociación de la
  familia personal.
- El contrato actual todavía dice `Familia de <displayName>`; debe corregirse al nombre real.
- `openapi.yaml` incluye `defaultFamilyId` dentro de `AuthTokens`, pero no lo marca como requerido.

**Alcance de la garantía:** la afirmación "`GET /me/families` nunca devuelve vacío" aplica a un
registro completado correctamente por `POST /auth/register`. El flujo actual es síncrono, pero la
atomicidad transaccional o la compensación si falla la creación de la familia no está demostrada
por este contrato y debe quedar como pendiente separado si el producto exige rollback completo.

**Cierre de BG-04:**

1. Actualizar la ficha de `POST /auth/register` en `api-contract.md` para indicar que crea
  `Mis finanzas personales`, asigna `OWNER` y devuelve `defaultFamilyId`.
2. Marcar `defaultFamilyId` como obligatorio en el esquema `AuthTokens` de `openapi.yaml`.
3. Añadir al contrato la relación: después de un registro exitoso, `GET /me/families` devuelve al
  menos la familia personal, con los cinco campos de BG-03.
4. Mantener los tests existentes y añadir una aserción HTTP que consulte `GET /me/families` usando
  el token devuelto por el registro y compruebe que contiene `defaultFamilyId` como `OWNER`.
5. Retirar BG-04 del listado de brechas una vez alineados `api-contract.md` y `openapi.yaml`.

#### BG-05 / T1 — Errores 401/403 tipados

> **Estado:** la implementación central está confirmada. `authenticate` y
> `requireFamilyMembership` lanzan errores de dominio, y el manejador HTTP global responde con
> `{ error, message }`. La renovación de sesión y sus errores de refresh quedan fuera de BG-05.

**Implementación verificada actualmente:**

- Sin header Bearer, `authenticate` lanza `AUTH.MISSING_TOKEN` y el status se resuelve a `401`.
- Con token inválido o expirado, `authenticate` lanza `AUTH.INVALID_TOKEN` y el status se resuelve
  a `401`.
- Un usuario que no pertenece a la familia recibe `FAMILY.NOT_A_MEMBER` con `403`.
- Un usuario con rol insuficiente recibe `FAMILY.INSUFFICIENT_ROLE` con `403`.
- `registerErrorHandler` serializa siempre el código y el mensaje del `DomainError`.
- Los endpoints protegidos de Family Access, Financial Tracking, Budgeting, Reporting y AI
  encadenan `authenticate` y, cuando corresponde, `requireFamilyMembership`.
- `api-contract.md` declara T1 implementada en su introducción, pero todavía conserva la brecha
  histórica en la tabla de pendientes y en el cierre del documento.

**Cierre de BG-05:**

1. Añadir o consolidar tests HTTP representativos que afirmen el cuerpo completo, no solo el
  status:
  - sin token → `401`, `AUTH.MISSING_TOKEN` y `message`.
  - token inválido/expirado → `401`, `AUTH.INVALID_TOKEN` y `message`.
  - usuario ajeno a la familia → `403`, `FAMILY.NOT_A_MEMBER` y `message`.
  - rol insuficiente → `403`, `FAMILY.INSUFFICIENT_ROLE` y `message`.
2. Revisar que no queden handlers protegidos que respondan manualmente textos sin código; la
  autenticación y autorización deben pasar por los middlewares comunes.
3. Retirar T1 de la tabla de brechas de `api-contract.md` y conservar allí la tabla final de
  códigos 401/403.
4. Mantener la especificación de `POST /auth/refresh` separada: `AUTH.INVALID_REFRESH_TOKEN` y
  `AUTH.POSSIBLE_TOKEN_THEFT` pertenecen a la renovación de sesión, no a BG-05.

#### BG-06 — Sincronización de `api-contract.md` y `openapi.yaml`

> **Estado:** pendiente de consolidación documental. Los dos archivos describen el mismo contrato,
> pero todavía contienen estados y formas diferentes. Las brechas BG-01 a BG-05 han demostrado que
> una implementación puede quedar reflejada en una sección y continuar apareciendo como pendiente
> o con una respuesta antigua en otra.

**Inconsistencias verificadas actualmente:**

- El catálogo de `api-contract.md` ya describe rutas implementadas y su sección 6 fue limpiada de
  T1, T2, T3, T4 y A1–A5; debe mantenerse así cuando se cierren nuevas fases.
- La sección 8 ya no marca T1, A1, A2, A5 ni A6 como bloqueadores; sus filas deben seguir
  reflejando únicamente brechas abiertas.
- `api-contract.md` y `openapi.yaml` no siempre coinciden en nombres, campos obligatorios y formas
  de respuesta; BG-03 detectó `familyId` frente a `id` y campos opcionales en `FamilySummary`.
- BG-04 detectó que el contrato textual usa un nombre antiguo para la familia personal y que
  OpenAPI no marca `defaultFamilyId` como obligatorio, aunque el registro lo devuelve.
- El catálogo de endpoints de `api-contract.md` y los `paths` de OpenAPI deben incluir la misma
  superficie: método, ruta, autenticación, parámetros, request body, respuesta y errores.

**Regla de sincronización:**

1. El comportamiento real del backend y sus tests determinan el contrato efectivo; no se deben
  conservar ejemplos o brechas que contradigan ese comportamiento.
2. `api-contract.md` es la especificación legible para producto y la app; `openapi.yaml` es su
  representación machine-readable. Ninguno debe introducir campos, rutas o errores que el otro no
  pueda respaldar.
3. Una brecha se retira de §6 solo cuando el endpoint, sus tests y ambas representaciones del
  contrato están alineados.

**Cierre de BG-06:**

1. Auditar el catálogo de la sección 3 contra los `paths` y `operationId` de `openapi.yaml`,
  incluyendo endpoints nuevos, métodos, autenticación y respuestas de error.
2. Actualizar las respuestas y esquemas afectados por BG-01 a BG-05: `invitedEmail`, los cinco
  campos obligatorios de `FamilySummary`, `defaultFamilyId`, el nombre de la familia personal y
  los códigos tipados de 401/403.
3. Limpiar la tabla de brechas de §6.1 y las tablas transversales relacionadas: retirar A5, A6 y
  T1 cuando su implementación, tests y documentación estén cerrados; mantener solo las brechas
  realmente abiertas.
4. Actualizar el mapa pantalla → endpoints de §8 para que sus bloqueadores correspondan con la
  tabla de brechas vigente y no vuelvan a listar funcionalidades resueltas.
5. Añadir una comprobación reproducible que compare, como mínimo, cada endpoint documentado en
  `api-contract.md` con un `path` de OpenAPI y revise los campos `required` de las respuestas
  críticas. Ejecutarla junto con la validación documental del plan.
6. Revisar Postman después de cada cambio de contrato; la colección no puede conservar payloads o
  expectativas de respuesta anteriores.

### 2.2 A4: miembros con nombre (y email para OWNER)

Family & Access **no importa Identity**. Se amplía el puerto `UserDirectoryPort`.

1. **Puerto:** `findProfilesByIds(userIds)` que devuelve `{ userId, displayName, email }` (proyección propia del contexto).
2. **Adaptador:** `IdentityUserDirectoryAdapter` lo implementa con una query interna de Identity (`GetUserProfilesByIds`, **no** expuesta por HTTP). Una sola consulta para todos los ids (sin N+1).
3. **Tests de aplicación (rojo):**
   - `GetFamilyMembers` devuelve `displayName` de cada miembro.
   - Si quien consulta es OWNER, incluye `email`; si es MEMBER, no.
   - Usuario sin perfil → `displayName: null`, sin romper la respuesta.
4. El caso de uso recibe el rol de quien consulta (ya lo resuelve `requireFamilyMembership` en `request.familyContext`).
5. Test de ruta con token de Member y de Owner. Los campos nuevos son aditivos.

### 2.3 A1: `GET /me/invitations`

> **BG-01 / RF-04 — resuelta:** la ruta y el caso de uso derivan el email desde el usuario
> autenticado. La query filtra `PENDING`, compara el email sin distinguir mayúsculas y excluye
> invitaciones vencidas. La respuesta conserva `invitedEmail` como destinatario y `invitedBy` como
> creador; la ruta cuenta con test HTTP para éxito y ambos errores 401.

**Implementación verificada actualmente:**

- `GET /me/invitations` usa `authenticate`; no acepta el email por querystring ni por body.
- `GetMyPendingInvitationsQuery` usa `findEmailByUserId`, `findByInvitedEmail` y filtra por estado,
  vencimiento y coincidencia case-insensitive.
- La respuesta incluye `id`, `familyId`, `familyName`, `invitedEmail`, `invitedBy`, `role`,
  `status` y `expiresAt`.
- `api-contract.md` y `openapi.yaml` documentan la respuesta con un esquema específico para las
  invitaciones propias.

**Cierre verificado de BG-01:**

1. `PendingInvitationDTO` incluye `invitedEmail` y mantiene `invitedBy` separado.
2. El test de aplicación cubre el filtro y la comparación case-insensitive; el test HTTP cubre:
  - 200 con invitación `PENDING` válida.
  - 401 con `AUTH.MISSING_TOKEN` sin Bearer.
  - 401 con `AUTH.INVALID_TOKEN` con token inválido.
3. `api-contract.md` y `openapi.yaml` describen la misma respuesta:

```json
[
  {
    "id": "uuid",
    "familyId": "uuid",
    "familyName": "Familia Gómez",
    "invitedEmail": "persona@example.com",
    "invitedBy": { "userId": "uuid", "displayName": "Rocío" },
    "role": "MEMBER",
    "status": "PENDING",
    "expiresAt": "2026-10-19T14:30:00.000Z"
  }
]
```

`invitedEmail` identifica al destinatario de la invitación y `invitedBy` identifica a quien la
creó. Si la app necesita el correo del invitador, puede ampliarse de forma aditiva sin alterar
`invitedEmail`.

### 2.4 A2: `POST /invitations/:invitationId/decline`

1. **Dominio:** estado `DECLINED` y método `Invitation.decline(byEmail, now)`:
   - Solo desde `PENDING` (si no, `FAMILY.INVITATION_NOT_PENDING`).
   - Vencida → `FAMILY.INVITATION_EXPIRED` (P3).
   - Email distinto al invitado → `FAMILY.INVITATION_NOT_FOR_USER` (403).
2. **Tests de dominio (rojo):** declinar pendiente; ya aceptada; ya revocada; ajena; vencida.
3. **Caso de uso** `DeclineInvitationUseCase`; no publica evento (nadie lo consume).
4. **Persistencia:** `status` admite `DECLINED` (migración aditiva si es enum de Postgres).
5. **Test de ruta:** 204, 404, 400, 403.
6. **Ajustar `accept`:** cuando el email no coincide, devolver `FAMILY.INVITATION_NOT_FOR_USER` en vez de un 403 sin código.

### 2.5 A3: `GET /families/:familyId/invitations`

1. **Repositorio:** `InvitationRepository.findByFamilyId(familyId, status?)`.
2. **Query** `GetFamilyInvitationsQuery`; `status` por defecto `PENDING`, o `ALL`.
3. **Tests (rojo):** solo OWNER; devuelve `invitedEmail`, `role`, `status`, `expiresAt`, `invitedBy`; filtra por estado; excluye otras familias.
4. Ruta con `requireFamilyMembership(OWNER)`.

### 2.6 Autorización de `DELETE /invitations/:invitationId` (P4)

1. Pueden revocar: **OWNER de la familia de la invitación**.
2. **Tests (rojo):** Owner de otra familia → 403; invitado → 403; Owner de la familia → 204; quien creó la invitación pero ya fue degradado a MEMBER → 403.
3. Cargar la invitación, luego la membresía del usuario en `invitation.familyId`, y exigir rol OWNER.

### 2.7 Cierre de la fase

- Mover A1–A6 a la sección 3 del contrato con respuestas reales.
- Postman: añadir *My Invitations*, *Decline Invitation* y *Family Invitations* en la carpeta *2*; endurecer *Get Family Members*.
- Actualizar `casos-de-uso-family-access.md`.

---

## Fase 3 — Dashboard y reportes

> **Estado actual:** implementados `PeriodResolver` para `America/Santiago` y el límite máximo de
> 24 meses para `trend`. La actualización de DTOs de dashboard, breakdown, comparison, drilldown y
> by-payment-method continúa en esta fase.

Con una sola moneda por familia (C1–C4) los reportes son más simples. Los **nombres e íconos de categoría** viven en Financial Tracking: se obtienen por un puerto.

**Forma común:** todo reporte lleva `currency` a nivel superior (la de la familia), y las cifras son `Money`.

### 3.0 Preparación

**a) Zona horaria de los períodos (Q3)**

1. Servicio `PeriodResolver` en `shared-kernel`: `periodOf(instant): Period` usando la zona `REPORTING_TIMEZONE` (por defecto `America/Santiago`) con `Intl.DateTimeFormat`. Sin dependencias; respeta el horario de verano.
2. **Tests (rojo):** `2026-11-01T02:30:00Z` → `2026-10` (aún es octubre en Chile); `2026-11-01T03:00:00Z` → `2026-11`; cambio de horario de verano; reloj inyectable para el "mes actual".
3. Lo usan **todos** los handlers que acumulan por período: read models de Reporting y `BudgetPeriodStatus`.
4. Con `db:reset` no hace falta reconstruir proyecciones.

**b) Puerto de catálogo de categorías**

1. **Puerto** en Reporting: `CategoryCatalogPort.listByFamily(familyId)` → `{ categoryId, name, type, icon, status }`.
2. **Adaptador** a Financial Tracking (`GetCategories`, deprecadas incluidas) y doble `FakeCategoryCatalog`.
3. Se consulta en el momento; si el rendimiento lo exige se cambia por una proyección sin afectar al contrato.

**c) Read models en unidades menores**

1. Confirmar que los totales por `(familia, período, categoría)` usan enteros (Fase 0.2e).
2. **Test (rojo):** crear un item, borrarlo y comprobar que el read model queda en **cero** (no en fila inexistente ni con residuos). Esto asegura que al volver a permitir el cambio de moneda (C3) los reportes no arrastran datos viejos.
3. **Test:** tras borrar todos los items y cambiar la moneda a USD, el dashboard devuelve ceros en USD.

### 3.1 B1, B2, B3: Dashboard

```json
{
  "period": "2026-10",
  "currency": "CLP",
  "totalExpenses": { "amount": 450000,  "currency": "CLP" },
  "totalIncome":   { "amount": 1200000, "currency": "CLP" },
  "balance":       { "amount": 750000,  "currency": "CLP" },
  "expenseByCategory": [
    { "categoryId": "uuid", "name": "Comestibles", "icon": "shopping_cart", "status": "ACTIVE",
      "amount": { "amount": 270000, "currency": "CLP" }, "percentage": 60 },
    { "categoryId": "uuid", "name": "Salud", "icon": null, "status": "ACTIVE",
      "amount": { "amount": 0, "currency": "CLP" }, "percentage": 0 }
  ],
  "incomeByCategory": []
}
```

1. **Tests de aplicación (rojo)** sobre `GetDashboardSummary`:
   - Incluye **todas** las categorías activas, con `0` si no hay movimientos (B2).
   - Incluye deprecadas **solo** si tienen movimientos en el período.
   - Gastos e ingresos en listas separadas.
   - `percentage` sobre el total de su tipo; total 0 → todos 0 (P12).
   - `balance = ingresos − gastos`; puede ser negativo.
   - Orden: mayor a menor monto; desempate por nombre.
   - Familia sin movimientos devuelve ceros, no error.
   - La moneda es la **actual de la familia**.
2. Combinar el read model con `CategoryCatalogPort`.
3. **Test de ruta:** `period` opcional (mes actual según `PeriodResolver`); inválido → `REPORTING.INVALID_PERIOD`; otro usuario → 403.
4. Retirar `categoryBreakdown` (P1) y actualizar tests y Postman.

### 3.2 B8: período inválido

1. Value object `Period.of("2026-10")`, valida `^\d{4}-(0[1-9]|1[0-2])$`.
2. `InvalidPeriodError` → `REPORTING.INVALID_PERIOD` (400).
3. Usarlo en todas las rutas de reportes y presupuestos.

### 3.3 B4: `breakdown`

```json
{
  "period": "2026-10",
  "type": "EXPENSE",
  "currency": "CLP",
  "total": { "amount": 450000, "currency": "CLP" },
  "entries": [
    { "categoryId": "uuid", "name": "Comestibles", "icon": "shopping_cart", "status": "ACTIVE",
      "amount": { "amount": 270000, "currency": "CLP" }, "percentage": 60 }
  ]
}
```

1. Tests: `icon`, `status`, `percentage`; `includeEmpty` (default `false`); `type` por defecto `EXPENSE`.
2. Extraer el cálculo común con el Dashboard a `CategoryTotalsCalculator` (agrupa, porcentajes y orden).

### 3.4 B5: `comparison`

```json
{
  "periodA": "2026-09",
  "periodB": "2026-10",
  "currency": "CLP",
  "a": { "totalExpenses": { "amount": 400000, "currency": "CLP" }, "totalIncome": { "amount": 1100000, "currency": "CLP" }, "balance": { "amount": 700000, "currency": "CLP" } },
  "b": { "totalExpenses": { "amount": 450000, "currency": "CLP" }, "totalIncome": { "amount": 1200000, "currency": "CLP" }, "balance": { "amount": 750000, "currency": "CLP" } },
  "expenseVariation": 12.5,
  "incomeVariation": 9.09
}
```

1. **Tests (rojo):** base 0 y comparado > 0 → `null`; ambos 0 → `0`; variación negativa; con `categoryId` solo esa categoría; cálculo con enteros (P13).
2. Fórmula `(B − A) / A × 100`, dos decimales; documentarla en el contrato.

> Las claves de los dos períodos pasan de `periodA`/`periodB` a `a`/`b` para no repetir el nombre con el campo que ya contiene el texto del período.

### 3.5 B6: `trend`

```json
{
  "fromPeriod": "2026-08",
  "toPeriod": "2026-10",
  "currency": "CLP",
  "points": [
    { "period": "2026-08", "totalExpenses": { "amount": 380000, "currency": "CLP" }, "totalIncome": { "amount": 1050000, "currency": "CLP" }, "balance": { "amount": 670000, "currency": "CLP" } }
  ]
}
```

1. **Tests (rojo):** meses sin movimientos con `0`; `fromPeriod > toPeriod` → `REPORTING.INVALID_PERIOD_RANGE`; rango > 24 meses (P11) → mismo error; orden ascendente.

### 3.6 B7: `drilldown`

```json
{
  "level": "category",
  "period": "2026-10",
  "type": "EXPENSE",
  "currency": "CLP",
  "entries": [
    { "categoryId": "uuid", "name": "Comestibles", "icon": "shopping_cart",
      "amount": { "amount": 270000, "currency": "CLP" }, "percentage": 60, "itemCount": 12 }
  ]
}
```

1. **Tests (rojo):** parámetro `type` (default `EXPENSE`); niveles `category` y `tag` con `icon`, `percentage`, `itemCount`; `tagId` sin `categoryId` → 400; tag de otra categoría → `FINANCIAL.TAG_DOES_NOT_BELONG_TO_CATEGORY`.
2. El nivel `item` devuelve los movimientos con `paymentMethodId` y `recordedByName` (Fase 4).

### 3.7 `by-payment-method`

1. Respuesta: `{ period, currency, entries: [ { paymentMethodId, paymentMethodName, amount: Money } ] }`.
2. **Tests (rojo):** medios deprecados con gasto en el período aparecen; medios en cero no; orden por monto descendente.

### 3.8 Presupuestos y zona horaria

1. `BudgetPeriodStatus` usa `PeriodResolver` (Q3).
2. **Tests (rojo):** un gasto del 31-oct a las 23:30 hora de Chile suma al presupuesto de octubre, no al de noviembre.
3. `GET /budgets` devuelve todas las cifras como `Money` en la moneda de la familia.

### 3.9 Cierre de la fase

- Mover B1–B8 a la sección 3 del contrato con respuestas reales; T3 y T4 quedan resueltas.
- Postman: endurecer la carpeta *7. Reporting* (forma `Money`, `currency` superior, orden).
- Actualizar `casos-de-uso-reporting.md` y `casos-de-uso-budgeting.md`.

---

## Fase 4 — Movimientos

> **Estado actual:** implementado I1: el listado de movimientos incluye `paymentMethodId` y los
> filtros `from`/`to` pueden enviarse de forma independiente. La paginación por cursor y
> `recordedByName` continúan pendientes en esta fase.

### 4.1 I1: `paymentMethodId` en el listado — Resuelto

1. Test: `GET /items` incluye `paymentMethodId` en cada elemento (el `POST` ya lo trae).
2. El listado usa `amount: Money` (Fase 0.2).

### 4.2 I3: quién registró el movimiento

1. Puerto propio de Financial Tracking `UserNamesPort` (no se acopla a Identity).
2. **Tests:** cada item incluye `recordedByName`; usuario sin perfil → `null`.
3. **Una sola consulta** para todos los `recordedBy` distintos (sin N+1).

### 4.3 I2: paginación (Q4)

1. `limit` (default 50, máximo 200) + `cursor` opaco basado en `(occurredOn, id)`.
2. **Respuesta:** `{ items: [...], nextCursor: string | null }`.
3. **Tests (rojo):** primera página; segunda con cursor; `limit` fuera de rango → 400; sin resultados; orden `occurredOn` descendente y estable ante empates; un item registrado mientras se pagina no repite ni salta elementos.
4. `from` y `to` pasan a poder enviarse **por separado** (hoy exigen ir juntos): test de cada combinación.
5. Índice `(family_id, occurred_on desc, id)`; migración aditiva.

---

## Fase 5 — Sugerencias de IA

> **Estado actual:** implementados S1, S2, S5, S6, S7, S8 y S9: `GET /families/:familyId/suggestions`
> lista las sugerencias pendientes aisladas por familia/usuario; las sugerencias tienen `expiresAt`
> a 24 horas y confirmar/descartar una vencida devuelve `AI.SUGGESTION_EXPIRED`; `GET /ai-usage`
> expone el cupo diario y los uploads validan campo, MIME y firma; `rawText` admite entre 1 y 500 caracteres,
> los cuerpos de confirmación validan importes enteros, una categoría ausente devuelve
> `AI.CATEGORY_REQUIRED` y la confirmación responde `201` con el `FinancialItem` creado. Continúan
> pendientes los campos `paymentMethodId`, `note` y `classificationOrigin` de S3/S4, además de
> `AskFinancialQuestion`, `GenerateInsights` y el rate limiting general.

Todo se desarrolla contra el **adaptador fake determinístico**.

### 5.1 Extracción de montos con decimales

El parser (fake o real) devuelve el importe **en unidades menores** de la moneda de la familia.

1. **Reglas del fake (tests en rojo):**
   - Moneda con exponente 0 (CLP): `.` y `,` son separadores de miles → `"18.500"` = 18500; `"18500"` = 18500; `"$ 18.500"` = 18500.
   - Moneda con exponente 2 (USD/EUR): un último separador seguido de 1 o 2 dígitos es decimal → `"15,99"` y `"15.99"` = 1599; `"15.5"` = 1550; `"1.299,90"` = 129990.
   - Más de 2 decimales en USD (`"15,999"`) → ambiguo → `AI.UNPARSEABLE_TEXT`.
2. El puerto `ReceiptScannerPort` también devuelve unidades menores.

### 5.2 S6: validación y error de texto

1. Esquema: `rawText` de 1 a 500 caracteres.
2. **Tests (rojo):** texto sin monto detectable → `AI.UNPARSEABLE_TEXT` (400); texto vacío o solo espacios → 400 de esquema.
3. `NaturalLanguageParserPort` puede señalar "no pude interpretar" en vez de devolver una sugerencia con monto 0.

### 5.3 S3, S4, S5: forma de la sugerencia

```json
{
  "id": "uuid",
  "status": "PENDING",
  "source": "TEXT",
  "amount": { "amount": 18500, "currency": "CLP" },
  "categoryId": "uuid | null",
  "classificationOrigin": "HISTORY | AI | NONE",
  "tagId": null,
  "paymentMethodId": "uuid | null",
  "occurredOn": "2026-10-12T00:00:00.000Z",
  "title": "Farmacia Ahumada",
  "note": null,
  "confidence": 0.88,
  "expiresAt": "2026-10-13T14:30:00.000Z"
}
```

1. **Tests (rojo):**
   - Comercio conocido en `MerchantCategoryHistory` → `classificationOrigin: "HISTORY"` y **no** se llama al puerto de IA (P15).
   - Comercio desconocido → `"AI"`.
   - Sin categoría posible → `categoryId: null`, `"NONE"`.
   - `paymentMethodId` queda `null` si el parser no lo infiere; el predeterminado se aplica **solo al confirmar**.
2. Columnas nuevas nullable (`classification_origin`, `payment_method_id`, `note`, `expires_at`); migración aditiva (o `db:reset`).

### 5.4 S2, S3, S5: `confirm` devuelve el item

1. **Cuerpo opcional:** `amount` (entero en unidades menores), `currency`, `categoryId`, `tagId`, `paymentMethodId`, `occurredOn`, `title`, `note`.
2. **Tests (rojo):**
   - Sin cuerpo y sugerencia completa → crea el item con lo sugerido.
   - Sugerencia sin categoría y cuerpo sin `categoryId` → `AI.CATEGORY_REQUIRED`.
   - Sin `paymentMethodId` en ninguno → usa el predeterminado; si no existe → `FINANCIAL.NO_DEFAULT_PAYMENT_METHOD_SET`.
   - Moneda distinta a la de la familia → `SHARED.CURRENCY_MISMATCH` (C1, P9).
   - Confirmar dos veces → `AI.SUGGESTION_NOT_PENDING`.
   - Confirmar una sugerencia de **otro usuario** → `AI.SUGGESTION_NOT_FOUND`.
   - Se actualiza `MerchantCategoryHistory` con la categoría **finalmente elegida**.
3. `ConfirmSuggestionUseCase` devuelve el `FinancialItem`; la ruta responde `201` con el mismo DTO que `POST /items`.
4. **Atomicidad:** crear el item y marcar `CONFIRMED` deben ocurrir juntos (se suma al pendiente de Unit of Work).

### 5.5 S1: `GET /families/:familyId/suggestions`

1. `GetPendingSuggestionsQuery`; `status` por defecto `PENDING`; solo las del usuario; excluye las vencidas.
2. **Tests (rojo):** solo las propias; no las de otros miembros; no confirmadas ni descartadas; no vencidas; orden por creación descendente.

### 5.6 S7: caducidad

1. `expiresAt = createdAt + 24 h` (P6, configurable).
2. `confirm` y `DELETE` sobre una sugerencia vencida → `AI.SUGGESTION_EXPIRED` (400).
3. **Tests con reloj controlado:** justo antes y justo después del vencimiento.
4. No hace falta un job de limpieza: se filtran al consultar.

### 5.7 Aislamiento

1. **Tests (rojo):** `confirm`/`DELETE` con `suggestionId` de otra familia o de otro miembro → `AI.SUGGESTION_NOT_FOUND` (no 403, para no revelar su existencia).
2. El repositorio busca siempre por `(id, familyId, requestedBy)`.

### 5.8 S8: límites de uso (Q5)

1. `AiUsageRepository` con `countForUserOnDay(userId, day)` e `increment(userId, day)`; `AiUsagePolicy` con `AI_DAILY_LIMIT` (30) y `AI_USAGE_TIMEZONE` (`America/Santiago`) reutilizando `PeriodResolver` para el "día".
2. **Tests (rojo):** dentro del límite pasa; la siguiente → `AI.USAGE_LIMIT_EXCEEDED` (429) con `limit`, `used`, `resetsAt`; reinicio al cambiar de día **en hora de Chile**; error de validación no consume (P14); resolución por historial no consume (P15).
3. `GET /families/:familyId/ai-usage` → `{ limit, used, remaining, resetsAt }`.
4. Respuesta `429` con header `Retry-After` y `details`.
5. El rate limiting general (`@fastify/rate-limit`) es otro tema y se aborda aparte.

### 5.9 S9: upload de recibo

1. Registrar `@fastify/multipart` con `fileSize` 10 MB y `files` 1 (P7).
2. **Tests (rojo):** sin archivo → `HTTP.INVALID_REQUEST_BODY`; tipo no permitido → `AI.UNSUPPORTED_IMAGE_TYPE`; archivo mayor al límite → `413` `HTTP.PAYLOAD_TOO_LARGE`; campo con nombre incorrecto → 400.
3. Validar el tipo por **contenido** (firma de bytes), no solo por `Content-Type`.
4. **Privacidad:** no persistir la imagen; se envía al puerto y se descarta.
5. Documentar en el contrato: campo `file`, tipos `image/jpeg`, `image/png`, `image/webp`, límite.

### 5.10 Cierre de la fase

- Mover S1–S9 a la sección 3 del contrato; S10 (`assistant/ask` e `insights`) queda pendiente.
- Postman: añadir *List Pending Suggestions* y *AI Usage* en la carpeta *8*; actualizar *Confirm Suggestion* (`201` con item).
- Actualizar `casos-de-uso-ai-assistance.md` y `plan-implementacion-ai-assistance.md`.

---

## 4. Resumen de nuevas rutas y cambios

| Tipo | Ruta / cambio | ID |
| --- | --- | :--: |
| Nueva | `GET /families/:familyId/settings` | C3 / Q6 |
| Nueva | `GET /me/invitations` | A1 |
| Nueva | `POST /invitations/:invitationId/decline` | A2 |
| Nueva | `GET /families/:familyId/invitations` | A3 |
| Nueva | `GET /families/:familyId/suggestions` | S1 |
| Nueva | `GET /families/:familyId/ai-usage` | S8 |
| Cambio | Dinero: entero en unidades menores en peticiones; `Money` en respuestas | T2 |
| Cambio | Errores 401/403 con código | T1 |
| Cambio | `PATCH .../settings/currency`: bloqueo `FAMILY.CURRENCY_LOCKED` | C2 |
| Cambio | Items, presupuestos y sugerencias: `currency` opcional y validada; desaparece la regla `amount`↔`currency` | C1 |
| Cambio | `GET .../members` (+`displayName`, `email` solo OWNER) | A4 |
| Cambio | `GET /me/families` (+`defaultCurrency`, `memberCount`), `GET /me/profile` (+`userId`) | A5, A6 |
| Cambio | `dashboard` (**rompe**), `breakdown`, `comparison`, `trend`, `drilldown`, `by-payment-method` con `currency` superior y `Money` | B1–B8 |
| Cambio | Períodos según `America/Santiago` | T4 |
| Cambio | `GET .../items` (+`paymentMethodId`, `recordedByName`; paginación con `{ items, nextCursor }`) | I1–I3 |
| Cambio | Sugerencias de IA (campos nuevos; `confirm` `204` → `201` con item) | S2–S7, S9 |

---

## 5. Apéndice: clases de error nuevas

> Se asume la forma habitual: una clase que extiende `DomainError` y pasa `code` y `message`. **Ajusta el `super(...)` a la firma real de tu `DomainError`** (`shared-kernel/errors/domain-error.ts`) y registra cada código en `resolveHttpStatus`. Los errores con datos (`details`) requieren ampliar el manejador global (Fase 0.1, paso 5).

```ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

// ---- Plataforma (auth)
class MissingTokenError extends DomainError {
  constructor() {
    super("AUTH.MISSING_TOKEN", "Falta el token de autenticación");
  }
}

class InvalidTokenError extends DomainError {
  constructor() {
    super("AUTH.INVALID_TOKEN", "Token inválido o expirado");
  }
}

// ---- Shared kernel
class CurrencyMismatchError extends DomainError {
  constructor(
    readonly expected: string,
    readonly received: string,
  ) {
    super(
      "SHARED.CURRENCY_MISMATCH",
      `La moneda ${received} no coincide con la de la familia (${expected})`,
    );
  }
}

class InvalidAmountError extends DomainError {
  constructor(reason: string) {
    super("SHARED.INVALID_AMOUNT", `Monto inválido: ${reason}`);
  }
}

// ---- Family & Access
class NotAFamilyMemberError extends DomainError {
  constructor() {
    super("FAMILY.NOT_A_MEMBER", "No perteneces a esta familia");
  }
}

class InvitationNotForUserError extends DomainError {
  constructor() {
    super("FAMILY.INVITATION_NOT_FOR_USER", "Esta invitación no está dirigida a tu cuenta");
  }
}

type CurrencyLockReason = "ITEMS_EXIST" | "ACTIVE_BUDGETS_EXIST";

class CurrencyLockedError extends DomainError {
  constructor(readonly reasons: CurrencyLockReason[]) {
    super(
      "FAMILY.CURRENCY_LOCKED",
      "No se puede cambiar la moneda mientras existan movimientos o presupuestos activos",
    );
  }

  get details(): { reasons: CurrencyLockReason[] } {
    return { reasons: this.reasons };
  }
}

// ---- Reporting
class InvalidPeriodError extends DomainError {
  constructor(value: string) {
    super("REPORTING.INVALID_PERIOD", `El período "${value}" no es válido. Usa el formato AAAA-MM`);
  }
}

class InvalidPeriodRangeError extends DomainError {
  constructor() {
    super(
      "REPORTING.INVALID_PERIOD_RANGE",
      "El rango de períodos no es válido (máximo 24 meses y el inicio no puede ser posterior al fin)",
    );
  }
}

// ---- AI Assistance
class UnparseableTextError extends DomainError {
  constructor() {
    super("AI.UNPARSEABLE_TEXT", "No pude interpretar el texto. Incluye al menos un monto");
  }
}

class CategoryRequiredError extends DomainError {
  constructor() {
    super("AI.CATEGORY_REQUIRED", "Debes elegir una categoría para confirmar la sugerencia");
  }
}

class SuggestionExpiredError extends DomainError {
  constructor() {
    super("AI.SUGGESTION_EXPIRED", "La sugerencia expiró. Genera una nueva");
  }
}

class UnsupportedImageTypeError extends DomainError {
  constructor() {
    super("AI.UNSUPPORTED_IMAGE_TYPE", "Formato de imagen no admitido. Usa JPEG, PNG o WebP");
  }
}

class AiUsageLimitExceededError extends DomainError {
  constructor(
    readonly limit: number,
    readonly used: number,
    readonly resetsAt: Date,
  ) {
    super("AI.USAGE_LIMIT_EXCEEDED", "Alcanzaste el límite diario de uso de IA");
  }

  get details(): { limit: number; used: number; resetsAt: string } {
    return { limit: this.limit, used: this.used, resetsAt: this.resetsAt.toISOString() };
  }
}

export {
  MissingTokenError,
  InvalidTokenError,
  CurrencyMismatchError,
  InvalidAmountError,
  NotAFamilyMemberError,
  InvitationNotForUserError,
  CurrencyLockedError,
  InvalidPeriodError,
  InvalidPeriodRangeError,
  UnparseableTextError,
  CategoryRequiredError,
  SuggestionExpiredError,
  UnsupportedImageTypeError,
  AiUsageLimitExceededError,
};
export type { CurrencyLockReason };
```

Cada clase va en su propio archivo dentro del contexto correspondiente (`platform/auth`, `shared-kernel/errors`, `family-access/domain/errors`, `reporting/domain/errors`, `ai-assistance/domain/errors`), siguiendo la convención actual.

Mapeo para `resolveHttpStatus`:

| Código | HTTP |
| --- | :--: |
| `AUTH.MISSING_TOKEN`, `AUTH.INVALID_TOKEN` | 401 |
| `FAMILY.NOT_A_MEMBER`, `FAMILY.INVITATION_NOT_FOR_USER` | 403 |
| `SHARED.CURRENCY_MISMATCH`, `FAMILY.CURRENCY_LOCKED` | 409 |
| `SHARED.INVALID_AMOUNT`, `REPORTING.INVALID_PERIOD`, `REPORTING.INVALID_PERIOD_RANGE` | 400 |
| `AI.UNPARSEABLE_TEXT`, `AI.CATEGORY_REQUIRED`, `AI.SUGGESTION_EXPIRED`, `AI.UNSUPPORTED_IMAGE_TYPE` | 400 |
| `AI.USAGE_LIMIT_EXCEEDED` | 429 |

---

## 6. Checklist por cada brecha

- [ ] Test de integración escrito primero y en rojo
- [ ] JSON Schema de body, params y querystring
- [ ] Autorización (`authenticate` + `requireFamilyMembership` con el rol correcto)
- [ ] Caso feliz + al menos un error de dominio + aislamiento entre familias
- [ ] Ningún cálculo de dinero con decimales
- [ ] Migración aditiva (o `db:reset` acordado) si cambia la base de datos
- [ ] `api-contract.md` actualizado (de la sección 6 a la 3, con respuesta real)
- [ ] Postman: `lastPhaseDone` subido en el environment y la carpeta de la fase en verde
- [ ] Documento de casos de uso del contexto actualizado
