# Budgeting — Casos de uso

Documentación de los casos de uso del contexto `Budgeting`, previa a su implementación. Sigue la misma convención usada en `casos-de-uso-family-access.md` y `casos-de-uso-financial-tracking.md`: **actor**, **precondiciones**, **flujo principal**, **flujos alternativos/errores**, **eventos de dominio disparados**.

Recordatorio de arquitectura: `Budgeting` es un **subdominio de soporte** (no core domain). Consume eventos de `Financial Tracking` (`ItemRecorded`, `ItemAmountChanged`, `ItemReclassified`, `ItemDeleted`) para mantener el seguimiento de gasto actualizado — el usuario interactúa con comandos explícitos (crear/editar presupuesto), mientras el recálculo del gasto ocurre vía **event handlers**.

## Modelo de mensualidad: híbrido (recurrente + overrides por período)

Los presupuestos son **mensuales**, con un modelo híbrido: se definen una vez y se aplican automáticamente cada mes (recurrente), pero se pueden sobrescribir para un mes específico sin afectar los demás. Esto separa dos conceptos que cambian por razones distintas:

- **`BudgetConfiguration`** (Aggregate Root) — la configuración recurrente por familia + categoría: un monto por defecto, y un mapa de excepciones puntuales por período (`overrides`). Cambia con poca frecuencia (el usuario la edita a propósito).
- **`BudgetPeriodStatus`** (Aggregate Root separado) — el seguimiento real de gasto de una familia + categoría + mes específico, con el límite resuelto (`limitAmount`, snapshot al momento de crear el registro del mes) y el `spent` acumulado. Cambia con cada movimiento financiero registrado en esa categoría/mes.
- **`BudgetPeriod`** (Value Object) — año + mes (ej. `"2026-09"`), con `BudgetPeriod.current()` y `BudgetPeriod.fromDate(date)` como factories.

`BudgetPeriodStatus.limitAmount` es un snapshot deliberado: si se cambia el `defaultAmount` de la configuración, los períodos ya generados no cambian su límite retroactivamente — solo los períodos nuevos (o un recálculo explícito, ver pendientes) toman el valor actualizado.

---

## Comandos sobre `BudgetConfiguration`

### 1. CreateBudgetConfiguration

Define un presupuesto recurrente para una categoría, con un monto por defecto que aplica desde ahora en adelante, todos los meses.

- **Actor**: un `Member` de la familia (a definir si se restringe a `Owner` — ver pendientes).
- **Precondiciones**: la familia existe; la categoría existe en `Financial Tracking` y está `Active`; no existe ya una `BudgetConfiguration` activa para esa categoría.
- **Entrada**: `familyId`, `categoryId`, `defaultAmount`.
- **Flujo principal**:
  1. Se valida `defaultAmount` como `Money`.
  2. Se valida que la categoría exista y esté activa (consulta cruzada a `Financial Tracking`, vía un puerto tipo `CategoryLookupPort`).
  3. Se valida que no exista otra `BudgetConfiguration` activa para la misma `categoryId`.
  4. Se invoca `BudgetConfiguration.create(familyId, categoryId, defaultAmount)`.
  5. Se persiste vía `BudgetConfigurationRepository.save()`.
- **Errores posibles**: `InvalidMoneyError`, `CategoryNotFoundError`, `CategoryNotActiveError`, `DuplicateBudgetConfigurationError`.
- **Eventos disparados**: `BudgetCreated`.

---

### 2. UpdateDefaultBudgetAmount

Modifica el monto por defecto de la configuración recurrente (afecta a los períodos futuros que no tengan un override propio; no modifica retroactivamente períodos ya generados).

- **Actor**: mismo criterio que `CreateBudgetConfiguration`.
- **Precondiciones**: la `BudgetConfiguration` existe y pertenece a la familia.
- **Entrada**: `familyId`, `budgetConfigurationId`, `newDefaultAmount`.
- **Flujo principal**:
  1. Se busca la `BudgetConfiguration`.
  2. Se valida `newDefaultAmount` como `Money`.
  3. Se invoca `budgetConfiguration.updateDefaultAmount(newDefaultAmount)`.
  4. Se persiste.
- **Errores posibles**: `BudgetConfigurationNotFoundError`, `InvalidMoneyError`.
- **Eventos disparados**: ninguno.
- **Nota de diseño (confirmada)**: este cambio **nunca** afecta `BudgetPeriodStatus` ya generados (meses pasados o el mes en curso) — solo aplica a partir de los períodos que se generen desde ahora en adelante, ya que `BudgetPeriodStatus` toma un snapshot del límite al momento de crearse. Esto es distinto del comportamiento de `SetBudgetOverrideForPeriod` (caso de uso 3), que sí actualiza de inmediato el `BudgetPeriodStatus` del mes específico al que apunta, incluso si ya tiene gasto acumulado.

---

### 3. SetBudgetOverrideForPeriod

Sobrescribe el monto límite para un mes específico, sin afectar la configuración recurrente ni otros meses.

- **Actor**: mismo criterio que `CreateBudgetConfiguration`.
- **Precondiciones**: la `BudgetConfiguration` existe.
- **Entrada**: `familyId`, `budgetConfigurationId`, `period`, `overrideAmount`.
- **Flujo principal**:
  1. Se busca la `BudgetConfiguration`.
  2. Se valida `overrideAmount` como `Money`.
  3. Se invoca `budgetConfiguration.setOverrideForPeriod(period, overrideAmount)`.
  4. Se persiste.
  5. Se busca el `BudgetPeriodStatus` correspondiente a `familyId` + `categoryId` + `period`. Si existe (ya hay gasto registrado ese mes), se actualiza su `limitAmount` al nuevo `overrideAmount` de inmediato — el cambio aplica en el momento, incluso con gasto ya acumulado. Si no existe todavía, no hay nada que actualizar (se creará con el valor correcto cuando llegue el primer gasto).
- **Errores posibles**: `BudgetConfigurationNotFoundError`, `InvalidMoneyError`.
- **Eventos disparados**: `BudgetOverspent` (si al actualizar el `limitAmount` el `BudgetPeriodStatus` queda en sobregiro y no lo estaba antes).

---

### 4. RemoveBudgetOverrideForPeriod

Elimina la excepción de un mes específico, volviendo a usar el monto por defecto de la configuración recurrente para ese período.

- **Entrada**: `familyId`, `budgetConfigurationId`, `period`.
- **Flujo principal**:
  1. Se busca la `BudgetConfiguration`.
  2. Se invoca `budgetConfiguration.removeOverrideForPeriod(period)`.
  3. Se persiste.
- **Errores posibles**: `BudgetConfigurationNotFoundError`, `NoOverrideForPeriodError` (si no existía override para ese período).
- **Eventos disparados**: ninguno.

---

### 5. DeactivateBudgetConfiguration

Desactiva el presupuesto recurrente — deja de generar seguimiento para meses futuros, pero conserva el histórico de `BudgetPeriodStatus` ya generado.

- **Entrada**: `familyId`, `budgetConfigurationId`.
- **Flujo principal**:
  1. Se busca la `BudgetConfiguration`.
  2. Se invoca `budgetConfiguration.deactivate()`.
  3. Se persiste.
- **Errores posibles**: `BudgetConfigurationNotFoundError`.
- **Eventos disparados**: ninguno.
- **Nota de diseño**: se prefiere `deactivate()` sobre un borrado físico, ya que el histórico de `BudgetPeriodStatus` de meses pasados debe seguir siendo consultable en `Reporting` aunque el presupuesto ya no esté vigente — mismo criterio que "deprecar" en `Category`/`Tag`.

---

## Queries

### 6. GetBudgets

Lista los presupuestos de la familia para un período dado, con su estado de gasto — corresponde a la tabla `Category / Budget / Spent / Remaining` de la especificación original.

- **Actor**: cualquier `Member` de la familia.
- **Entrada**: `familyId`, `period` (opcional, default: `BudgetPeriod.current()`).
- **Flujo principal**:
  1. Se buscan todas las `BudgetConfiguration` activas de la familia.
  2. Por cada una, se resuelve el monto aplicable al período (`resolveAmountFor(period)` — override si existe, si no el `defaultAmount`).
  3. Se busca el `BudgetPeriodStatus` correspondiente a esa categoría + período; si no existe todavía (nadie ha gastado en esa categoría este mes), se asume `spent = 0` sin crear el registro (se crea recién con el primer `ItemRecorded`, ver el handler correspondiente).
  4. Se calcula `Remaining = limitAmount - spent`.
  5. Se devuelve la lista, incluyendo el nombre de la categoría (consulta cruzada a `Financial Tracking`).
- **Errores posibles**: ninguno propio.
- **Nota de producto**: esta sección es **opcional y configurable desde Settings**, según la especificación original — la visibilidad es una preferencia de UI/familia, no una regla de este caso de uso.

---

## Event Handlers (reacciones automáticas, no invocados por el usuario)

Se registran contra el `EventBus` y reaccionan a eventos publicados por `Financial Tracking`. Todos operan sobre `BudgetPeriodStatus`, nunca sobre `BudgetConfiguration`.

### 7. OnItemRecordedHandler

- **Se dispara con**: `ItemRecorded`.
- **Flujo principal**:
  1. Si `event.type !== Expense`, se ignora.
  2. Se busca una `BudgetConfiguration` activa para `familyId` + `categoryId` del evento; si no existe, no se hace nada (no todas las categorías tienen presupuesto).
  3. Se calcula `period = BudgetPeriod.fromDate(event.occurredOn)`.
  4. Se busca (o se crea, si es el primer gasto del mes en esa categoría) el `BudgetPeriodStatus` para `familyId` + `categoryId` + `period`, usando `budgetConfiguration.resolveAmountFor(period)` como `limitAmount` inicial.
  5. Se invoca `budgetPeriodStatus.registerSpending(event.amount)`.
  6. Se persiste.
- **Eventos disparados**: `BudgetOverspent` (si `registerSpending` cruza el límite y no lo había cruzado antes).

---

### 8. OnItemAmountChangedHandler

- **Se dispara con**: `ItemAmountChanged`.
- **Precondición de diseño**: requiere que el evento incluya tanto el monto anterior como el nuevo (`previousAmount`, `newAmount`) — ver pendientes, hoy el evento solo definía el estado nuevo.
- **Flujo principal**: igual que `OnItemRecordedHandler` en la resolución del `BudgetPeriodStatus`, pero aplicando la diferencia (`newAmount - previousAmount`) en vez del monto completo.
- **Eventos disparados**: `BudgetOverspent` (si aplica).

---

### 9. OnItemReclassifiedHandler

- **Se dispara con**: `ItemReclassified`.
- **Flujo principal**:
  1. Se resta el monto del `BudgetPeriodStatus` de la categoría anterior (si existía uno para ese período).
  2. Se suma el monto al `BudgetPeriodStatus` de la nueva categoría (creándolo si es necesario, igual que en `OnItemRecordedHandler`).
- **Eventos disparados**: `BudgetOverspent` (para el `BudgetPeriodStatus` de destino, si aplica).

---

### 10. OnItemDeletedHandler

- **Se dispara con**: `ItemDeleted`.
- **Flujo principal**: resta el monto del `BudgetPeriodStatus` correspondiente a la categoría/período del item eliminado, si existe.
- **Eventos disparados**: ninguno.

---

## Resumen de errores nuevos a definir

| Error | Casos de uso donde aparece | ¿Ya existe? |
|---|---|---|
| `BudgetConfigurationNotFoundError` | UpdateDefaultBudgetAmount, SetBudgetOverrideForPeriod, RemoveBudgetOverrideForPeriod, DeactivateBudgetConfiguration | ❌ nuevo |
| `DuplicateBudgetConfigurationError` | CreateBudgetConfiguration | ❌ nuevo |
| `NoOverrideForPeriodError` | RemoveBudgetOverrideForPeriod | ❌ nuevo |
| `InvalidBudgetPeriodError` | Construcción de `BudgetPeriod` (mes fuera de 1–12) | ❌ nuevo |
| `CategoryNotFoundError` / `CategoryNotActiveError` | CreateBudgetConfiguration | (compartidos con `Financial Tracking`) |
| `InvalidMoneyError` | Varios | ✅ ya definido (pendiente de mover a `shared-kernel`, ver más abajo) |

## Pendientes antes de implementar

1. **Permisos**: mismo punto abierto que en `Financial Tracking` — ¿cualquier `Member` puede gestionar presupuestos, o solo `Owner`?
2. **`Money` compartido**: sigue pendiente moverlo a `shared-kernel`, igual que `Currency`, para que `Budgeting` no dependa del dominio interno de `Financial Tracking`.
3. **Consulta cruzada de categorías**: `CreateBudgetConfiguration` y `GetBudgets` necesitan un puerto tipo `CategoryLookupPort` hacia `Financial Tracking`.
4. **`ItemAmountChanged` necesita `previousAmount`**: hay que confirmar/ajustar el payload del evento para que `OnItemAmountChangedHandler` pueda calcular la diferencia correctamente.
