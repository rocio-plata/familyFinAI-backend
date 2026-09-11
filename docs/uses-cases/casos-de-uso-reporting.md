# Reporting & Analytics — Casos de uso

Documentación de los casos de uso del contexto `Reporting`. El modelo de dominio inicial está
implementado (`CategoryPeriodAggregate`, `Period` compartido e `ItemCount`) y las queries
`GetDashboardSummary`, `GetCategoryBreakdown`, `GetPeriodComparison`, `GetTrend` y `GetDrillDown`
ya cuentan con pruebas unitarias. `OnItemRecordedHandler`, `OnItemAmountChangedHandler`,
`OnItemReclassifiedHandler` y `OnItemDeletedHandler` también están implementados y probados. La
persistencia InMemory y Drizzle de `CategoryPeriodAggregate`, la composición del módulo, las
suscripciones al `EventBus` y las rutas HTTP ya están implementadas. Siguen pendientes el resto de
las queries descritas aquí. Sigue la misma convención usada en los documentos anteriores:
**actor**, **precondiciones**, **flujo principal**, **flujos alternativos/errores**, **eventos de
dominio disparados**.

Recordatorio de arquitectura: `Reporting` es casi puramente un **consumidor** de eventos (patrón CQRS, lado de lectura) — no expone comandos que el usuario invoque directamente para modificar nada; toda su "escritura" ocurre vía event handlers que reaccionan a lo que pasa en `Financial Tracking`. Sus casos de uso visibles para el usuario son todos **queries**.

## Modelo de lectura: `CategoryPeriodAggregate`

Para que las queries no tengan que recalcular sumas sobre todos los `FinancialItem` cada vez (costoso a medida que crece el histórico), se mantiene un **read model materializado**, actualizado incrementalmente por los event handlers — mismo patrón que `BudgetPeriodStatus` en `Budgeting`, pero sin lógica de límites, solo acumulación:

```typescript
interface CategoryPeriodAggregate {
  familyId: FamilyId;
  categoryId: CategoryId;
  period: Period;              // reutilizado desde shared-kernel
  totalExpense: Money;
  totalIncome: Money;
  itemCount: number;
}
```

Este read model es la base de `GetDashboardSummary`, `GetCategoryBreakdown` y `GetPeriodComparison`. `GetTrend` y `GetDrillDown` se apoyan en él parcialmente, pero necesitan datos adicionales (ver cada caso de uso).

---

## Queries

### 1. GetDashboardSummary

> Estado de implementación: implementado en
> `src/contexts/reporting/application/queries/get-dashboard-summary.query.ts`, con pruebas
> unitarias. Pendientes: adaptador de persistencia, registro en la composición y ruta HTTP.

Vista rápida de la situación financiera del período actual — la pantalla principal de la app, según la especificación original.

- **Actor**: cualquier `Member` de la familia.
- **Entrada**: `familyId`, `period` (opcional, default: `Period.current()`).
- **Flujo principal**:
  1. Se consultan todos los `CategoryPeriodAggregate` de la familia para ese período.
  2. Se calcula el resumen: `totalExpenses` (suma de todos los `totalExpense`), `totalIncome` (suma de todos los `totalIncome`), `balance` (`totalIncome - totalExpenses`).
  3. Se identifica la distribución por categoría (cada agregado con su proporción del gasto total, para el gráfico de torta/barras).
  4. Se devuelve el DTO consolidado.
- **Errores posibles**: ninguno propio (familia sin movimientos en el período devuelve resumen en cero).

---

### 2. GetCategoryBreakdown

> Estado de implementación: implementado en
> `src/contexts/reporting/application/queries/get-category-breakdown.query.ts`, con pruebas
> unitarias. Resuelve los nombres mediante `GetCategoriesQuery`, incluyendo categorías deprecadas
> para conservar el histórico. Pendientes: adaptador de persistencia, registro en la composición y
> ruta HTTP.

Distribución de gastos por categoría para un período — alimenta los gráficos de categorías del dashboard y de la sección de Reports.

- **Actor**: cualquier `Member` de la familia.
- **Entrada**: `familyId`, `period`, `type` (opcional: `Expense` | `Income`, default `Expense`).
- **Flujo principal**:
  1. Se consultan los `CategoryPeriodAggregate` de la familia para ese período.
  2. Se filtran/proyectan según `type` (monto de gasto o de ingreso, según corresponda).
  3. Se devuelve la lista ordenada de mayor a menor monto, con el nombre de cada categoría (consulta cruzada a `Financial Tracking`).
- **Errores posibles**: ninguno propio.

---

### 3. GetPeriodComparison

> Estado de implementación: implementado en
> `src/contexts/reporting/application/queries/get-period-comparison.query.ts`, con pruebas
> unitarias. Devuelve gastos, ingresos y saldo para cada período, además de las variaciones de
> gastos e ingresos. Para una base de comparación en cero, la variación porcentual es `0`.
> Pendientes: adaptador de persistencia, registro en la composición y ruta HTTP.

Compara dos períodos entre sí — por categoría o a nivel total.

- **Actor**: cualquier `Member` de la familia.
- **Entrada**: `familyId`, `periodA`, `periodB`, `categoryId` (opcional — si se omite, compara totales generales).
- **Flujo principal**:
  1. Se consultan los `CategoryPeriodAggregate` de ambos períodos (filtrados por `categoryId` si se especificó).
  2. Se calcula la diferencia absoluta y porcentual entre ambos períodos.
  3. Se devuelve el DTO con ambos valores y la variación — esta es la base del insight tipo *"Your restaurant expenses increased 35% compared with last month"* que menciona la especificación original para `AI Assistance` (`Reporting` provee el cálculo; `AI Assistance` lo redacta en lenguaje natural).
- **Errores posibles**: ninguno propio (un período sin datos se compara como cero).

---

### 4. GetTrend

> Estado de implementación: implementado en
> `src/contexts/reporting/application/queries/get-trend.query.ts`, con pruebas unitarias. Genera
> una serie mensual inclusiva con gastos, ingresos, saldo y ceros para períodos sin agregados;
> admite filtro por `categoryId` y lanza `InvalidPeriodRangeError` para rangos invertidos.
> Pendientes: adaptador de persistencia, registro en la composición y ruta HTTP.

Evolución de ingresos y gastos a lo largo de varios períodos consecutivos — para gráficos de tendencia en la sección de Reports.

- **Actor**: cualquier `Member` de la familia.
- **Entrada**: `familyId`, `fromPeriod`, `toPeriod` (rango de meses), `categoryId` (opcional — si se omite, evolución general).
- **Flujo principal**:
  1. Se generan todos los `Period` dentro del rango solicitado.
  2. Por cada uno, se busca el `CategoryPeriodAggregate` correspondiente (o se asume cero si no existe).
  3. Se devuelve la serie de datos ordenada cronológicamente, lista para graficar.
- **Errores posibles**: `InvalidPeriodRangeError` (si `fromPeriod` es posterior a `toPeriod`).

---

### 5. GetDrillDown

> Estado de implementación: implementado en
> `src/contexts/reporting/application/queries/get-drill-down.query.ts`, con pruebas unitarias.
> Devuelve un resultado discriminado por nivel: `category` delega en `GetCategoryBreakdownQuery`,
> `tag` agrupa los gastos obtenidos mediante `GetFinancialItemsQuery`, e `item` devuelve los DTOs
> individuales filtrados por categoría y tag. Pendientes: adaptador de persistencia, registro en
> la composición y ruta HTTP.

Navega desde una vista general hacia los movimientos individuales que la componen — la característica de drill-down mencionada en la especificación original (`Gastos → Comestibles → Supermarket → Items individuales`).

- **Actor**: cualquier `Member` de la familia.
- **Entrada**: `familyId`, `period`, `categoryId` (opcional), `tagId` (opcional — solo válido si se especifica `categoryId`).
- **Flujo principal**:
  1. Si no se especifica `categoryId`: se devuelve el desglose por categoría del período (equivalente a `GetCategoryBreakdown`).
  2. Si se especifica `categoryId` pero no `tagId`: se devuelve el desglose por tag dentro de esa categoría para el período — esto **no** viene de `CategoryPeriodAggregate` (que agrega a nivel de categoría, no de tag), sino de una consulta directa a `FinancialItemRepository` agrupando por tag.
  3. Si se especifica `categoryId` y `tagId`: se devuelve la lista de `FinancialItem` individuales que cumplen esos filtros — delega directamente en el caso de uso `GetFinancialItems` de `Financial Tracking` (`Reporting` no duplica esa consulta, la reutiliza).
- **Errores posibles**: `TagWithoutCategoryError` (si se especifica `tagId` sin `categoryId`).
- **Nota de diseño**: este es el único caso de uso de `Reporting` que **no** se apoya completamente en el read model propio — el último nivel del drill-down consulta directamente a `Financial Tracking`, ya que el read model no está pensado para almacenar el detalle de cada movimiento individual, solo agregados.

---

## Event Handlers (mantenimiento del read model)

Reaccionan a los eventos de `Financial Tracking`, actualizando `CategoryPeriodAggregate`. Estructuralmente muy similares a los handlers que ya definimos para `Budgeting`, pero sin lógica de límites/sobregiro — solo acumulación.

### 6. OnItemRecordedHandler

> Estado de implementación: implementado en
> `src/contexts/reporting/application/event-handlers/on-item-recorded.event-handler.ts`, con
> pruebas unitarias. El evento `ItemRecorded` transporta `occurredOn`, `currency` y el
> `FinancialItemType`; el handler crea o actualiza el agregado de familia, categoría y período.
> Pendientes: adaptador de persistencia y suscripción en la composición de la aplicación.

- **Se dispara con**: `ItemRecorded`.
- **Flujo principal**:
  1. Se calcula `period = Period.fromDate(event.occurredOn)`.
  2. Se busca (o se crea) el `CategoryPeriodAggregate` para `familyId` + `categoryId` + `period`.
  3. Según `event.type`, se suma el monto a `totalExpense` o `totalIncome`, y se incrementa `itemCount`.
  4. Se persiste.
- **Eventos disparados**: ninguno (este contexto no tiene consumidores propios).

---

### 7. OnItemAmountChangedHandler

> Estado de implementación: implementado en
> `src/contexts/reporting/application/event-handlers/on-item-amount-changed.event-handler.ts`,
> con pruebas unitarias. El evento `ItemAmountChanged` incluye categoría, tipo y fecha; el handler
> aplica la diferencia entre `previousAmount` y `newAmount` sin modificar `itemCount`.
> Pendientes: adaptador de persistencia y suscripción en la composición de la aplicación.

- **Se dispara con**: `ItemAmountChanged`.
- **Flujo principal**: ajusta `totalExpense`/`totalIncome` del `CategoryPeriodAggregate` correspondiente con la diferencia entre el monto anterior y el nuevo, conservando `itemCount`.

---

### 8. OnItemReclassifiedHandler

> Estado de implementación: implementado en
> `src/contexts/reporting/application/event-handlers/on-item-reclassified.event-handler.ts`, con
> pruebas unitarias. El evento `ItemReclassified` incluye tipo, fecha, importe y moneda; el handler
> resta el movimiento del agregado anterior y lo registra en el agregado nuevo, creándolo si hace
> falta. Pendientes: adaptador de persistencia y suscripción en la composición de la aplicación.

- **Se dispara con**: `ItemReclassified`.
- **Flujo principal**: resta el monto del `CategoryPeriodAggregate` de la categoría anterior (y decrementa `itemCount`), suma al de la nueva categoría (creándolo si es necesario, e incrementa su `itemCount`).

---

### 9. OnItemDeletedHandler

> Estado de implementación: implementado en
> `src/contexts/reporting/application/event-handlers/on-item-deleted.event-handler.ts`, con
> pruebas unitarias. El evento `ItemDeleted` incluye tipo, fecha, importe y moneda; el handler
> resta el movimiento del agregado de familia, categoría y período correspondiente. Pendientes:
> adaptador de persistencia y suscripción en la composición de la aplicación.

- **Se dispara con**: `ItemDeleted`.
- **Flujo principal**: resta el monto del `CategoryPeriodAggregate` correspondiente y decrementa `itemCount`.

---

## Resumen de errores nuevos a definir

| Error | Casos de uso donde aparece | ¿Ya existe? |
|---|---|---|
| `InvalidPeriodRangeError` | GetTrend | ❌ nuevo |
| `TagWithoutCategoryError` | GetDrillDown | ❌ nuevo |

Nótese que `Reporting` es el contexto con **menos errores propios** de todos los definidos hasta ahora — coherente con ser un contexto de solo lectura: casi no hay invariantes de negocio que proteger, solo consultas y agregaciones.

## Pendientes antes de implementar

1. **Puerto hacia `Financial Tracking`**: `GetCategoryBreakdown`, `GetDrillDown`, etc. necesitan resolver nombres de categorías/tags y, en el último nivel del drill-down, delegar en `GetFinancialItems`. Se resuelve con un puerto de solo lectura hacia `Financial Tracking`, similar al `CategoryLookupPort` que ya usa `AI Assistance` y que quedó pendiente para `Budgeting`.
2. **Reconstrucción histórica**: no se realiza backfill desde `financial_items`. Después de un reset de la base de datos, `category_period_aggregates` comienza vacío y se pobla únicamente mediante eventos nuevos. `CategoryPeriodAggregate.reconstitute` solo hidrata filas del propio read model cuando el repositorio las lee; no recalcula históricos.
3. **Insights y recomendaciones** (`AI Assistance`, sección 10.5 de la especificación original): `GetPeriodComparison` provee el cálculo numérico que alimentaría un insight como *"tus gastos en restaurantes subieron 35%"*, pero la generación del insight en sí (decidir qué comparaciones son "interesantes" de mostrar, redactarlas en lenguaje natural) vive en `AI Assistance`, no aquí — falta definir el contrato entre ambos contextos para ese flujo.
