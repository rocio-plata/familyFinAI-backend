# Budgeting — Casos de uso

Documentación de los casos de uso del contexto `Budgeting`, previa a su implementación. Sigue la misma convención usada en `casos-de-uso-family-access.md` y `casos-de-uso-financial-tracking.md`: **actor**, **precondiciones**, **flujo principal**, **flujos alternativos/errores**, **eventos de dominio disparados**.

Recordatorio de arquitectura: `Budgeting` es un **subdominio de soporte** (no core domain). Es principalmente **consumidor** de eventos de `Financial Tracking` (`ItemRecorded`, `ItemAmountChanged`, `ItemReclassified`, `ItemDeleted`) — la mayoría de sus casos de uso son comandos explícitos del usuario (crear/editar presupuesto), mientras que el recálculo de "gastado" ocurre vía **event handlers**, no vía comando directo.

Basado en las entidades y value objects ya mencionados: `Budget`, `BudgetPeriod`, `Overspend`, y el patrón `OnItemRecordedHandler` que ya esbozamos como ejemplo al definir la comunicación entre contextos.

---

## Comandos

### 1. CreateBudget

Define un presupuesto mensual para una categoría específica.

- **Actor**: un `Member` de la familia (a definir si se restringe a `Owner` — ver pendientes, mismo punto abierto que en `Financial Tracking`).
- **Precondiciones**: la familia existe; la categoría existe en `Financial Tracking` y está `Active`; no existe ya un presupuesto activo para esa categoría en el mismo período.
- **Entrada**: `familyId`, `categoryId`, `amount` (monto límite), `period` (mes/año, ej. `2026-09`).
- **Flujo principal**:
  1. Se valida `amount` como `Money` (reutilizando el Value Object de `Financial Tracking`, vía `shared-kernel` o una consulta cruzada — ver pendientes).
  2. Se valida que la categoría exista y esté activa (consulta a `Financial Tracking`, similar al patrón `CategoryLookupPort` que ya usa `AI Assistance`).
  3. Se valida que no exista otro `Budget` activo para la misma `categoryId` + `period`.
  4. Se invoca `Budget.create(familyId, categoryId, amount, period)`.
  5. Se persiste vía `BudgetRepository.save()`.
- **Errores posibles**: `InvalidMoneyError`, `CategoryNotFoundError`, `CategoryNotActiveError`, `DuplicateBudgetForPeriodError`.
- **Eventos disparados**: `BudgetCreated`.

---

### 2. UpdateBudgetAmount

Modifica el monto límite de un presupuesto ya definido.

- **Actor**: mismo criterio que `CreateBudget`.
- **Precondiciones**: el `Budget` existe y pertenece a la familia.
- **Entrada**: `familyId`, `budgetId`, `newAmount`.
- **Flujo principal**:
  1. Se busca el `Budget`, validando que pertenezca a la familia.
  2. Se valida `newAmount` como `Money`.
  3. Se invoca `budget.updateAmount(newAmount)` — esto puede hacer que un presupuesto pase de "ok" a `Overspent` o viceversa, dependiendo del gasto ya acumulado.
  4. Se persiste.
- **Errores posibles**: `BudgetNotFoundError`, `InvalidMoneyError`.
- **Eventos disparados**: `BudgetOverspent` (solo si el nuevo monto deja el presupuesto en estado de sobregiro y no lo estaba antes).

---

### 3. DeleteBudget

Elimina un presupuesto (deja de hacerse seguimiento a esa categoría/período).

- **Actor**: mismo criterio que `CreateBudget`.
- **Precondiciones**: el `Budget` existe y pertenece a la familia.
- **Entrada**: `familyId`, `budgetId`.
- **Flujo principal**:
  1. Se busca el `Budget`.
  2. Se elimina vía `BudgetRepository.delete()`.
- **Errores posibles**: `BudgetNotFoundError`.
- **Eventos disparados**: ninguno definido — a diferencia de `Financial Tracking`, eliminar un presupuesto no debería afectar a otros contextos (nadie más consume el estado de un `Budget`).

---

## Queries

### 4. GetBudgets

Lista los presupuestos de la familia para un período dado, con su estado de gasto — corresponde a la tabla `Category / Budget / Spent / Remaining` de la especificación original.

- **Actor**: cualquier `Member` de la familia.
- **Entrada**: `familyId`, `period` (opcional, default: mes actual).
- **Flujo principal**:
  1. Se consulta `BudgetRepository.findByFamilyAndPeriod()`.
  2. Por cada `Budget`, se calcula `Remaining = Budget - Spent` (el campo `Spent` ya vive actualizado en el propio `Budget`, mantenido por el event handler — ver más abajo, no se recalcula en la query).
  3. Se devuelve la lista mapeada a DTO, incluyendo el nombre de la categoría (requiere resolver `categoryId → nombre`, consulta cruzada a `Financial Tracking`).
- **Errores posibles**: ninguno propio (una familia sin presupuestos definidos devuelve lista vacía).
- **Nota de producto**: según la especificación original, esta sección es **opcional y configurable desde Settings** — la visibilidad del feature es una preferencia de UI/familia, no una regla de este caso de uso en sí.

---

## Event Handlers (reacciones, no casos de uso invocados por el usuario)

Estos no se exponen como endpoints HTTP — se registran contra el `EventBus` y reaccionan automáticamente a lo que ocurre en `Financial Tracking`.

### 5. OnItemRecordedHandler

Recalcula el gasto acumulado de un presupuesto cuando se registra un nuevo movimiento.

- **Se dispara con**: `ItemRecorded` (publicado por `Financial Tracking`).
- **Precondición**: existe un `Budget` activo para la `categoryId` y el período (mes) del evento; si no existe, el handler no hace nada (no todas las categorías tienen presupuesto).
- **Flujo principal**:
  1. Si `event.type !== Expense`, se ignora (los presupuestos solo hacen seguimiento de gastos, no de ingresos).
  2. Se busca el `Budget` activo por `familyId` + `categoryId` + período correspondiente a `event.occurredOn`.
  3. Si no existe, no se hace nada.
  4. Se invoca `budget.registerSpending(event.amount)` — el propio agregado protege su invariante de overspend.
  5. Se persiste el `Budget` actualizado.
- **Eventos disparados**: `BudgetOverspent` (solo si `registerSpending` hace que el presupuesto cruce el límite y no lo había cruzado antes).

---

### 6. OnItemAmountChangedHandler

Ajusta el gasto acumulado cuando se corrige el monto de un movimiento ya registrado.

- **Se dispara con**: `ItemAmountChanged`.
- **Flujo principal**: similar a `OnItemRecordedHandler`, pero calculando la diferencia (`newAmount - oldAmount`) en vez de sumar el monto completo — requiere que el evento incluya ambos valores, o que el handler pueda calcular la diferencia de otra forma (ver pendientes).
- **Eventos disparados**: `BudgetOverspent` (si aplica).

---

### 7. OnItemReclassifiedHandler

Mueve el gasto de un presupuesto a otro cuando un movimiento cambia de categoría.

- **Se dispara con**: `ItemReclassified`.
- **Flujo principal**:
  1. Se resta el monto del `Budget` de la categoría anterior (si existía uno para ese período).
  2. Se suma el monto al `Budget` de la nueva categoría (si existe uno para ese período).
- **Eventos disparados**: `BudgetOverspent` (para el presupuesto de destino, si aplica).

---

### 8. OnItemDeletedHandler

Revierte el efecto de un movimiento eliminado sobre el presupuesto correspondiente.

- **Se dispara con**: `ItemDeleted`.
- **Flujo principal**: resta el monto del `Budget` correspondiente a la categoría/período del item eliminado, si existe.
- **Eventos disparados**: ninguno (revertir un gasto nunca genera un nuevo sobregiro).

---

### 9. ClosePeriod (proceso, no evento reactivo)

Cierra un período mensual, consolidando el estado final de todos los presupuestos de la familia. A diferencia de los handlers anteriores, este no reacciona a un evento de `Financial Tracking` — se dispara por tiempo (fin de mes) o manualmente.

- **Actor**: proceso programado (cron/scheduled job) — a definir mecanismo concreto (ver pendientes).
- **Entrada**: `familyId`, `period`.
- **Flujo principal**:
  1. Se buscan todos los `Budget` activos de la familia para ese período.
  2. Se invoca `budget.closePeriod()` en cada uno (marca el período como cerrado, deja de aceptar más `registerSpending`).
  3. Se persisten.
- **Errores posibles**: ninguno propio.
- **Eventos disparados**: `BudgetPeriodClosed` (consumido por `Reporting`, para consolidar el histórico del período).

---

## Resumen de errores nuevos a definir

| Error | Casos de uso donde aparece | ¿Ya existe? |
|---|---|---|
| `BudgetNotFoundError` | UpdateBudgetAmount, DeleteBudget | ❌ nuevo |
| `DuplicateBudgetForPeriodError` | CreateBudget | ❌ nuevo |
| `CategoryNotFoundError` / `CategoryNotActiveError` | CreateBudget | (compartidos con `Financial Tracking`, ya documentados ahí) |
| `InvalidMoneyError` | CreateBudget, UpdateBudgetAmount | ✅ ya definido (en `Financial Tracking` — a decidir si se mueve a `shared-kernel`, ver pendientes) |

## Pendientes antes de implementar

1. **Permisos**: mismo punto abierto que en `Financial Tracking` — ¿cualquier `Member` puede crear/editar/eliminar presupuestos, o queda reservado a `Owner`?
2. **`Money` compartido**: `Budgeting` necesita el Value Object `Money` que hoy vive en `financial-tracking/domain/value-objects/`. Como ya movimos `Currency` a `shared-kernel` por la misma razón, probablemente `Money` deba seguir el mismo camino para que `Budgeting` no dependa del dominio interno de `Financial Tracking`.
3. **Consulta cruzada de categorías**: `CreateBudget` y `GetBudgets` necesitan resolver `categoryId → datos de la categoría` (para validar que existe/está activa, y para mostrar su nombre). Se resolvería con un puerto similar a `CategoryLookupPort`, que ya definimos como ejemplo cuando vimos `AI Assistance`.
4. **`OnItemAmountChangedHandler`**: necesita saber el monto *anterior* del item para calcular la diferencia — hay que decidir si el evento `ItemAmountChanged` debe incluir `previousAmount` además del nuevo (hoy no está definido qué payload exacto lleva este evento).
5. **Mecanismo de `ClosePeriod`**: ¿cron job dentro del propio backend (ej. `node-cron`), un endpoint que se llama externamente (ej. desde un servicio de scheduling del proveedor cloud), o se calcula "al vuelo" en `GetBudgets` sin necesidad de un cierre físico? Esto último simplificaría bastante el diseño y evitaría depender de infraestructura de scheduling — a evaluar si `ClosePeriod` es realmente necesario para el MVP.
6. **Definición de "período"**: se asume mensual en toda la documentación (consistente con la especificación original), pero no está formalizado como Value Object (`BudgetPeriod`) con sus propias reglas (ej. cómo se calculan los límites de un mes, zona horaria a usar).
