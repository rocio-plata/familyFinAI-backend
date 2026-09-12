# Financial Tracking — Casos de uso

Documentación de los casos de uso del contexto `Financial Tracking` (core domain), ya implementado
y expuesto por HTTP. Sigue la misma convención usada en `casos-de-uso-family-access.md`: **actor**,
**precondiciones**, **flujo principal**, **flujos alternativos/errores**, **eventos de dominio
disparados**.

Basado en las entidades y value objects ya definidos: `FinancialItem`, `Category`, `Tag`, `CategoryAssignment`, `Money`, `TransactionDate`, `Title`, `Note`, `FinancialItemType`, `CategoryStatus`/`TagStatus`, y los Domain Services `CategoryDeletionService`/`TagDeletionService`.

> **Estado de implementación**: los 16 casos de uso de este documento (1–16) ya están implementados en `src/contexts/financial-tracking/application/`, con sus tests correspondientes en `tests/contexts/financial-tracking/`. Las secciones de "Errores" y "Pendientes" al final de este documento reflejan las decisiones ya tomadas durante la implementación.

---

## FinancialItem

### 1. CreateFinancialItem

Registra un nuevo gasto o ingreso.

- **Actor**: un `Member` de la familia (cualquier rol — según la especificación original, todos los miembros pueden registrar movimientos).
- **Precondiciones**: la familia existe; la categoría indicada existe, pertenece a la familia y está `Active` (no `Deprecated`); si se indica tag, pertenece a esa categoría.
- **Entrada**: `familyId`, `recordedBy` (UserId, del token), `amount`, `currency` (opcional, default `family.defaultCurrency`), `categoryId`, `tagId` (opcional), `title`, `note` (opcional), `occurredOn`.
- **Flujo principal**:
  1. Se valida cada campo como su Value Object correspondiente (`Money`, `Title`, `Note`, `TransactionDate`).
  2. Se busca la `Category` por `categoryId`; se valida que pertenezca a la familia y esté `Active`.
  3. Si hay `tagId`, se valida que el tag exista dentro de esa categoría y esté `Active`.
  4. Se construye `CategoryAssignment` con ambos.
  5. Se invoca `FinancialItem.create(props, category.type)` — el tipo del item ya **no** es un dato de entrada: se hereda siempre de `category.type`, resuelto por el caso de uso a partir de la categoría ya buscada en el paso 2.
  6. Se persiste vía `FinancialItemRepository.save()`.
- **Errores posibles**: `InvalidMoneyError`, `InvalidTitleError`, `InvalidNoteError`, `FutureTransactionDateError`, `CategoryNotFoundError`, `CategoryNotActiveError`, `TagNotFoundError`, `TagNotActiveError`, `TagDoesNotBelongToCategoryError`.
- **Eventos disparados**: `ItemRecorded`.
- **Nota de diseño (reajuste tipo-categoría)**: el tipo (`Expense`/`Income`) pasó a ser una propiedad inmutable de `Category`, no un dato que el usuario elija al registrar un movimiento — evita inconsistencias como un item `Income` con categoría `"Supermercado"`. Ver `plan-ajuste-tipo-categoria.md` para el detalle completo del rediseño.

---

### 2. UpdateFinancialItem

Corrige uno o más campos editables de un movimiento ya registrado: monto, fecha, título y/o nota. Unificado en un solo caso de uso (en vez de uno por campo) para reflejar mejor un formulario de edición típico.

- **Actor**: el `Member` que registró el item, o cualquier `Member` con permisos suficientes (a definir — ver pendientes).
- **Precondiciones**: el `FinancialItem` existe y pertenece a la familia del solicitante.
- **Entrada**: `familyId`, `itemId`, y de forma opcional (solo se aplican los campos presentes): `amount`, `occurredOn`, `title`, `note`.
- **Flujo principal**:
  1. Se busca el `FinancialItem`, validando que pertenezca a la familia.
  2. Por cada campo presente en la entrada, se valida como su Value Object correspondiente (`Money`, `TransactionDate`, `Title`, `Note`) y se aplica con el método de la entidad que corresponda (`updateAmount`, `updateOccurredOn`, `updateTitle`, `updateNote`).
  3. Se persiste.
- **Errores posibles**: `FinancialItemNotFoundError`, `InvalidMoneyError`, `FutureTransactionDateError`, `InvalidTitleError`, `InvalidNoteError`.
- **Eventos disparados**: `ItemAmountChanged` (solo si `amount` fue parte de la entrada). Los cambios de fecha/título/nota no disparan evento propio hoy — a confirmar si algún contexto necesitaría reaccionar a ellos (ver pendientes).
- **Nota de diseño**: este caso de uso **no acepta** `categoryId`/`tagId`. Para cambiar la categoría de un movimiento, el frontend debe invocar `ReclassifyFinancialItem` por separado (dos llamadas si el usuario edita ambos tipos de campo a la vez). El command/DTO de entrada debe tiparse de forma estricta (sin campos opcionales de categoría) para que enviar esos campos por error sea rechazado por TypeScript o por el esquema de validación HTTP, en vez de ignorarse en silencio.

---

### 3. ReclassifyFinancialItem

Cambia la categoría y/o tag de un movimiento.

- **Actor**: mismo criterio que `UpdateFinancialItem`.
- **Precondiciones**: el `FinancialItem` existe; la nueva categoría existe, pertenece a la familia y está `Active`; si hay tag, pertenece a esa categoría y está `Active`.
- **Entrada**: `familyId`, `itemId`, `newCategoryId`, `newTagId` (opcional).
- **Flujo principal**:
  1. Se busca el `FinancialItem`.
  2. Se valida la nueva categoría/tag (mismas reglas que en `CreateFinancialItem`, pasos 2–4).
  3. Se invoca `item.reclassify(newCategoryAssignment, newCategory.type)` — la entidad valida que `newCategory.type` coincida con el tipo actual del item antes de aplicar el cambio.
  4. Se persiste.
- **Errores posibles**: `FinancialItemNotFoundError`, `CategoryNotFoundError`, `CategoryNotActiveError`, `TagNotFoundError`, `TagNotActiveError`, `TagDoesNotBelongToCategoryError`, `CannotReclassifyAcrossTypesError`.
- **Eventos disparados**: `ItemReclassified`.
- **Nota de diseño (reajuste tipo-categoría)**: no se puede reclasificar un item hacia una categoría de tipo distinto (mover un gasto a una categoría de ingreso) — cambiaría el tipo del item de forma implícita. Se rechaza con `CannotReclassifyAcrossTypesError`.

---

### 4. DeleteFinancialItem

Elimina un movimiento.

- **Actor**: mismo criterio que `UpdateFinancialItem`.
- **Precondiciones**: el `FinancialItem` existe y pertenece a la familia.
- **Entrada**: `familyId`, `itemId`.
- **Flujo principal**:
  1. Se busca el `FinancialItem`.
  2. Se elimina vía `FinancialItemRepository.delete()` (o se marca eliminado, según estrategia de persistencia a definir).
- **Errores posibles**: `FinancialItemNotFoundError`.
- **Eventos disparados**: `ItemDeleted`.
- **Nota de impacto cruzado**: `Budgeting` y `Reporting` deben "revertir" el efecto que tuvo `ItemRecorded` sobre sus read models/presupuestos.

---

## Category

### 5. CreateCategory

Crea una categoría nueva para la familia.

- **Actor**: únicamente el `Owner` de la familia. Decisión tomada para mantener la taxonomía de categorías bajo control administrativo — evita que cualquier miembro modifique una estructura compartida por toda la familia.
- **Precondiciones**: la familia existe; quien solicita es `Owner` de esa familia; no existe ya una categoría con el mismo nombre en la familia, sin importar su estado (`Active` o `Deprecated` — comparación case-insensitive, según la regla que definimos en `CategoryName.equals()`).
- **Entrada**: `familyId`, `requestedBy` (UserId, del token), `type` (`Expense` | `Income`, obligatorio), `name`.
- **Flujo principal**:
  1. Se consulta la membresía de `requestedBy` en la familia (`GetFamilyMembershipQuery`, de `Family & Access`) y se valida que su rol sea `Owner`.
  2. Se valida `name` como `CategoryName`.
  3. Se verifica que no exista otra categoría con el mismo nombre en la familia, sea `Active` o `Deprecated`.
  4. Se invoca `Category.create(familyId, type, name)`.
  5. Se persiste.
- **Errores posibles**: `InsufficientRoleError`, `InvalidCategoryNameError`, `DuplicateCategoryNameError`.
- **Eventos disparados**: `CategoryCreated`.
- **Nota de diseño**: una categoría `Deprecated` con el mismo nombre **bloquea** la creación de una nueva — si se deprecó fue porque no se necesitaba, así que no tiene sentido crear un duplicado. Para volver a usarla, el flujo correcto es `ReactivateCategory` (caso de uso 6), no crear una categoría nueva con el mismo nombre.
- **Nota de diseño (reajuste tipo-categoría)**: `type` es obligatorio y sin valor por defecto — se fuerza al usuario a elegir explícitamente `Expense` o `Income` al crear la categoría. Una vez creada, `Category.type` es **inmutable**: no existe `changeType()` en la entidad, ya que cambiarlo dejaría inconsistentes los items históricos ya clasificados bajo esa categoría.

---

### 6. ReactivateCategory

Reactiva una categoría previamente deprecada, permitiendo volver a usarla en nuevos registros.

- **Actor**: mismo criterio que `CreateCategory` — únicamente el `Owner`.
- **Precondiciones**: la `Category` existe y pertenece a la familia; quien solicita es `Owner`.
- **Entrada**: `familyId`, `requestedBy` (UserId, del token), `categoryId`.
- **Flujo principal**:
  1. Se consulta la membresía de `requestedBy` y se valida que su rol sea `Owner`.
  2. Se busca la `Category`, validando que pertenezca a la familia.
  3. Se invoca `category.reactivate()` (idempotente — si ya estaba `Active`, no falla).
  4. Se persiste.
- **Errores posibles**: `InsufficientRoleError`, `CategoryNotFoundError`.
- **Eventos disparados**: `CategoryReactivated` (consumido por `AI Assistance`, simétrico a `CategoryDeprecated`, para volver a sugerir la categoría).

---

### 7. RenameCategory

Renombra una categoría existente.

- **Actor**: mismo criterio que `CreateCategory` — únicamente el `Owner`.
- **Precondiciones**: la `Category` existe y pertenece a la familia; quien solicita es `Owner`; el nuevo nombre no colisiona con otra categoría de la familia (comparación case-insensitive, sin importar su estado `Active` o `Deprecated` — mismo criterio que `CreateCategory`).
- **Entrada**: `familyId`, `requestedBy` (UserId, del token), `categoryId`, `newName`.
- **Flujo principal**:
  1. Se consulta la membresía de `requestedBy` y se valida que su rol sea `Owner`.
  2. Se busca la `Category`, validando que pertenezca a la familia.
  3. Se valida `newName` y que no colisione con otra categoría existente de la familia (excluyendo a la propia).
  4. Se invoca `category.rename(newName)`.
  5. Se persiste.
- **Errores posibles**: `InsufficientRoleError`, `CategoryNotFoundError`, `InvalidCategoryNameError`, `DuplicateCategoryNameError`.
- **Eventos disparados**: ninguno definido — a evaluar si `Reporting`/`AI Assistance` necesitan reaccionar a un renombrado (probablemente sí, para no mostrar el nombre viejo en reportes históricos o en `MerchantCategoryHistory`).

---

### 8. DeleteCategory

Elimina físicamente una categoría, usando `CategoryDeletionService`.

- **Actor**: mismo criterio que `CreateCategory` — únicamente el `Owner`.
- **Precondiciones**: la `Category` existe y pertenece a la familia; quien solicita es `Owner`; la categoría no tiene `FinancialItem`s asociados.
- **Entrada**: `familyId`, `requestedBy` (UserId, del token), `categoryId`.
- **Flujo principal**:
  1. Se consulta la membresía de `requestedBy` y se valida que su rol sea `Owner`.
  2. Se busca la `Category`, validando que pertenezca a la familia.
  3. Se invoca `CategoryDeletionService.delete(category)` — internamente consulta `FinancialItemRepository.countByCategory()`.
  4. Si no tiene items asociados, se elimina físicamente vía `CategoryRepository.delete()`; si tiene, se rechaza.
- **Errores posibles**: `InsufficientRoleError`, `CategoryNotFoundError`, `CategoryHasAssociatedItemsError`.
- **Eventos disparados**: ninguno definido (a diferencia de `CategoryDeprecated`, que sí está en el catálogo original — ver pendientes, puede que `DeleteCategory` no necesite evento propio ya que, por definición, nunca tuvo items ni afectó reportes).
- **Nota de diseño**: una categoría **con items asociados nunca puede eliminarse físicamente** — la única forma de retirarla del uso activo preservando el histórico es `DeprecateCategory` (caso de uso 9). `DeleteCategory` solo aplica a categorías que nunca se usaron.

---

### 9. DeprecateCategory

Marca una categoría como no disponible para nuevos registros, preservando el histórico.

- **Actor**: mismo criterio que `CreateCategory` — únicamente el `Owner`.
- **Precondiciones**: la `Category` existe y pertenece a la familia; quien solicita es `Owner`.
- **Entrada**: `familyId`, `requestedBy` (UserId, del token), `categoryId`.
- **Flujo principal**:
  1. Se consulta la membresía de `requestedBy` y se valida que su rol sea `Owner`.
  2. Se busca la `Category`, validando que pertenezca a la familia.
  3. Se invoca `category.deprecate()` (siempre permitido, sin chequeo de items).
  4. Se persiste.
- **Errores posibles**: `InsufficientRoleError`, `CategoryNotFoundError`.
- **Eventos disparados**: `CategoryDeprecated` (consumido por `AI Assistance`, para no sugerir categorías deprecadas).

---

### 10. AddTagToCategory

Agrega un tag nuevo dentro de una categoría.

- **Actor**: cualquier `Member` de la familia (a diferencia de los demás casos de uso de `Category`, este no está restringido a `Owner` — cualquier miembro puede agregar tags de uso diario).
- **Precondiciones**: la `Category` existe, pertenece a la familia y está `Active`; el nombre del tag no colisiona con otro tag existente en esa categoría (comparación case-insensitive).
- **Entrada**: `familyId`, `categoryId`, `tagName`.
- **Flujo principal**:
  1. Se busca la `Category`, validando que pertenezca a la familia y esté `Active` (¿se puede agregar un tag a una categoría deprecada? — se decidió que no, ver pendientes).
  2. Se valida `tagName` y que no colisione con otro tag existente en esa categoría.
  3. Se invoca `category.addTag(tagName)` (agrega al final, con el siguiente `displayOrder`).
  4. Se persiste.
- **Errores posibles**: `CategoryNotFoundError`, `CategoryNotActiveError`, `InvalidTagNameError`, `DuplicateTagNameError`.
- **Eventos disparados**: `TagCreated`.

---

### 11. ReorderCategoryTags

Reordena los tags de una categoría según la preferencia manual del usuario.

- **Actor**: cualquier `Member` de la familia (mismo criterio que `AddTagToCategory` — es una preferencia de organización personal/diaria, no administrativa).
- **Precondiciones**: la `Category` existe y pertenece a la familia; `orderedTagIds` contiene exactamente los mismos tags que ya tiene la categoría (sin faltantes, sin extras, sin duplicados).
- **Entrada**: `familyId`, `categoryId`, `orderedTagIds` (array completo de `TagId` en el nuevo orden).
- **Flujo principal**:
  1. Se busca la `Category`, validando que pertenezca a la familia.
  2. Se invoca `category.reorderTags(orderedTagIds)` — valida que el array contenga exactamente los mismos tags que ya tiene la categoría, y reasigna `displayOrder` según la posición.
  3. Se persiste.
- **Errores posibles**: `CategoryNotFoundError`, `InvalidTagOrderError` (el array no coincide con los tags actuales de la categoría).
- **Eventos disparados**: ninguno.

---

## Tag

### 12. RenameTag

- **Actor**: mismo criterio que `CreateCategory` — únicamente el `Owner`.
- **Entrada**: `familyId`, `requestedBy` (UserId, del token), `categoryId`, `tagId`, `newName`.
- **Flujo principal**: análogo a `RenameCategory`, operando sobre el `Tag` dentro de la `Category` (incluyendo la validación de rol `Owner` vía `GetFamilyMembershipQuery`).
- **Errores posibles**: `InsufficientRoleError`, `CategoryNotFoundError`, `TagNotFoundError`, `InvalidTagNameError`, `DuplicateTagNameError`.
- **Eventos disparados**: ninguno definido (mismo pendiente que `RenameCategory`).

---

### 13. DeleteTag

Elimina físicamente un tag, usando `TagDeletionService`.

- **Actor**: mismo criterio que `CreateCategory` — únicamente el `Owner`.
- **Entrada**: `familyId`, `requestedBy` (UserId, del token), `categoryId`, `tagId`.
- **Flujo principal**: análogo a `DeleteCategory` (incluyendo la validación de rol `Owner` vía `GetFamilyMembershipQuery`), usando `TagDeletionService.delete(tag)` (consulta `FinancialItemRepository.countByTag()`).
- **Errores posibles**: `InsufficientRoleError`, `CategoryNotFoundError`, `TagNotFoundError`, `TagHasAssociatedItemsError`.
- **Eventos disparados**: ninguno definido.

---

### 14. DeprecateTag

- **Actor**: mismo criterio que `CreateCategory` — únicamente el `Owner`.
- **Entrada**: `familyId`, `requestedBy` (UserId, del token), `categoryId`, `tagId`.
- **Flujo principal**: análogo a `DeprecateCategory` (incluyendo la validación de rol `Owner` vía `GetFamilyMembershipQuery`), invocando `category.deprecateTag(tagId)` (busca el tag dentro de la categoría, invoca `tag.deprecate()` y registra el evento).
- **Errores posibles**: `InsufficientRoleError`, `CategoryNotFoundError`, `TagNotFoundError`.
- **Eventos disparados**: `TagDeprecated`.

---

## Queries

### 15. GetFinancialItems

Lista y filtra los movimientos financieros de la familia — corresponde a la "Consulta de items" de la especificación original.

- **Actor**: cualquier `Member` de la familia.
- **Entrada**: `familyId`, y filtros opcionales: `period` (rango de fechas), `categoryId`, `tagId`, `type` (Expense/Income).
- **Flujo principal**:
  1. Se consulta `FinancialItemRepository` con los filtros dados.
  2. Se devuelve la lista mapeada a DTO.
- **Errores posibles**: ninguno propio (una familia sin movimientos devuelve lista vacía).

---

### 16. GetCategories

Lista las categorías (con sus tags) de la familia — para poblar selectores en la UI y la sección de administración de categorías.

- **Actor**: cualquier `Member` de la familia.
- **Entrada**: `familyId`, `type` (opcional, `Expense` | `Income`), `includeDeprecated` (opcional, default `false`).
- **Flujo principal**:
  1. Se consulta `CategoryRepository.findByFamilyId()`.
  2. Se filtran las deprecadas si `includeDeprecated` es `false`.
  3. Si se especifica `type`, se filtran solo las categorías de ese tipo — es el filtro que alimenta las pantallas de "categorías de gasto"/"categorías de ingreso".
  4. Se devuelve la lista (cada categoría con sus tags, ya ordenados por `displayOrder`, y su `type`).
- **Errores posibles**: ninguno propio.

---

## Resumen de errores nuevos a definir

| Error | Casos de uso donde aparece | ¿Ya existe? |
|---|---|---|
| `FinancialItemNotFoundError` | UpdateFinancialItem, ReclassifyFinancialItem, DeleteFinancialItem | ✅ ya definido |
| `InsufficientRoleError` (propio de `Financial Tracking`) | CreateCategory, ReactivateCategory, RenameCategory, DeleteCategory, DeprecateCategory, RenameTag, DeleteTag, DeprecateTag | ✅ ya definido |
| `CategoryNotFoundError` | Varios | ✅ ya definido |
| `CategoryNotActiveError` | CreateFinancialItem, ReclassifyFinancialItem, AddTagToCategory | ✅ ya definido |
| `TagNotFoundError` | Varios | ✅ ya definido |
| `TagNotActiveError` | CreateFinancialItem, ReclassifyFinancialItem | ✅ ya definido |
| `TagDoesNotBelongToCategoryError` | CreateFinancialItem, ReclassifyFinancialItem | ✅ ya definido |
| `DuplicateCategoryNameError` | CreateCategory, RenameCategory | ✅ ya definido |
| `DuplicateTagNameError` | AddTagToCategory, RenameTag | ✅ ya definido |
| `InvalidTagOrderError` | ReorderCategoryTags | ✅ ya definido |
| `CategoryHasAssociatedItemsError` | DeleteCategory | ✅ ya definido |
| `TagHasAssociatedItemsError` | DeleteTag | ✅ ya definido |
| `CannotReclassifyAcrossTypesError` | ReclassifyFinancialItem | ✅ ya definido (reajuste tipo-categoría) |
| `InvalidMoneyError`, `InvalidTitleError`, `InvalidNoteError`, `FutureTransactionDateError`, `InvalidCategoryNameError`, `InvalidTagNameError` | CreateFinancialItem y afines | ✅ ya definidos |

## Pendientes antes de implementar

> Nota: los puntos 1–5 quedaron resueltos durante la implementación de los 16 casos de uso; se dejan documentados como registro de la decisión tomada. El punto 6 sigue abierto.

1. **Permisos** — **resuelto**: `CreateCategory`, `ReactivateCategory`, `RenameCategory`, `DeleteCategory`, `DeprecateCategory`, `RenameTag`, `DeleteTag` y `DeprecateTag` quedaron restringidos a `Owner` (validan vía `GetFamilyMembershipQuery` y lanzan `InsufficientRoleError`); `AddTagToCategory` y `ReorderCategoryTags` quedaron abiertos a cualquier `Member` (sin chequeo de rol en el caso de uso). `CreateFinancialItem`, `UpdateFinancialItem`, `ReclassifyFinancialItem` y `DeleteFinancialItem` tampoco validan rol — cualquier `Member` de la familia puede operar sobre los movimientos, incluyendo los registrados por otro miembro.
2. **Eventos de renombrado** — **resuelto**: se implementó sin evento propio, tal como estaba definido; `RenameCategoryUseCase` y `RenameTagUseCase` no reciben `EventBus` ni publican eventos. Si Reporting necesitara reaccionar a renombrados en el futuro, sería una mejora posterior.
3. **`DeleteCategory`/`DeleteTag` sin evento** — **resuelto**: se implementaron sin publicar eventos (no reciben `EventBus`), confirmando que por definición nunca tuvieron items asociados y no hay nada que revertir en otros contextos.
4. **`AddTagToCategory` sobre categoría deprecada** — **resuelto e implementado**: se rechaza con `CategoryNotActiveError`; una categoría debe reactivarse primero (`ReactivateCategory`) antes de poder agregarle tags nuevos.
5. **Estrategia de borrado de `FinancialItem`** — **resuelto**: borrado físico. `DeleteFinancialItemUseCase` invoca `FinancialItemRepository.delete()` y publica `ItemDeleted` para que `Budgeting`/`Reporting` reviertan el efecto de `ItemRecorded`.
6. **Resolución de `Currency` por defecto**: ✅ resuelto en la ruta HTTP de creación. `CreateFinancialItemUseCase` recibe un `Money` ya construido y la ruta consulta `GetFamilyDefaultCurrencyQuery` cuando el cliente no envía moneda.
7. **El tipo (`Expense`/`Income`) pertenece a la categoría, no al item** — **resuelto e implementado** (ver `plan-ajuste-tipo-categoria.md`): `Category.type` es inmutable, `CreateFinancialItemUseCase` lo resuelve desde la categoría, `ReclassifyFinancialItem` rechaza cambios entre tipos y `GetCategories` admite filtro por tipo. Budgeting valida categorías `Expense`; la simplificación de `CategoryPeriodAggregate` sigue siendo opcional.