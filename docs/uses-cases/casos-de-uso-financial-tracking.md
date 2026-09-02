# Financial Tracking — Casos de uso

Documentación de los casos de uso del contexto `Financial Tracking` (core domain), previa a su implementación. Sigue la misma convención usada en `casos-de-uso-family-access.md`: **actor**, **precondiciones**, **flujo principal**, **flujos alternativos/errores**, **eventos de dominio disparados**.

Basado en las entidades y value objects ya definidos: `FinancialItem`, `Category`, `Tag`, `CategoryAssignment`, `Money`, `TransactionDate`, `Title`, `Note`, `FinancialItemType`, `CategoryStatus`/`TagStatus`, y los Domain Services `CategoryDeletionService`/`TagDeletionService`.

---

## FinancialItem

### 1. CreateFinancialItem

Registra un nuevo gasto o ingreso.

- **Actor**: un `Member` de la familia (cualquier rol — según la especificación original, todos los miembros pueden registrar movimientos).
- **Precondiciones**: la familia existe; la categoría indicada existe, pertenece a la familia y está `Active` (no `Deprecated`); si se indica tag, pertenece a esa categoría.
- **Entrada**: `familyId`, `recordedBy` (UserId, del token), `type` (opcional, default `Expense`), `amount`, `currency` (opcional, default `family.defaultCurrency`), `categoryId`, `tagId` (opcional), `title`, `note` (opcional), `occurredOn`.
- **Flujo principal**:
  1. Se valida cada campo como su Value Object correspondiente (`Money`, `Title`, `Note`, `TransactionDate`).
  2. Se busca la `Category` por `categoryId`; se valida que pertenezca a la familia y esté `Active`.
  3. Si hay `tagId`, se valida que el tag exista dentro de esa categoría y esté `Active`.
  4. Se construye `CategoryAssignment` con ambos.
  5. Se invoca `FinancialItem.create(props)`.
  6. Se persiste vía `FinancialItemRepository.save()`.
- **Errores posibles**: `InvalidMoneyError`, `InvalidTitleError`, `InvalidNoteError`, `FutureTransactionDateError`, `CategoryNotFoundError`, `CategoryNotActiveError`, `TagNotFoundError`, `TagNotActiveError`, `TagDoesNotBelongToCategoryError`.
- **Eventos disparados**: `ItemRecorded`.

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
  3. Se invoca `item.reclassify(newCategoryAssignment)`.
  4. Se persiste.
- **Errores posibles**: `FinancialItemNotFoundError`, `CategoryNotFoundError`, `CategoryNotActiveError`, `TagNotFoundError`, `TagNotActiveError`, `TagDoesNotBelongToCategoryError`.
- **Eventos disparados**: `ItemReclassified`.

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
- **Entrada**: `familyId`, `requestedBy` (UserId, del token), `name`.
- **Flujo principal**:
  1. Se consulta la membresía de `requestedBy` en la familia (`GetFamilyMembershipQuery`, de `Family & Access`) y se valida que su rol sea `Owner`.
  2. Se valida `name` como `CategoryName`.
  3. Se verifica que no exista otra categoría con el mismo nombre en la familia, sea `Active` o `Deprecated`.
  4. Se invoca `Category.create(familyId, name)`.
  5. Se persiste.
- **Errores posibles**: `InsufficientRoleError`, `InvalidCategoryNameError`, `DuplicateCategoryNameError`.
- **Eventos disparados**: `CategoryCreated`.
- **Nota de diseño**: una categoría `Deprecated` con el mismo nombre **bloquea** la creación de una nueva — si se deprecó fue porque no se necesitaba, así que no tiene sentido crear un duplicado. Para volver a usarla, el flujo correcto es `ReactivateCategory` (caso de uso 6), no crear una categoría nueva con el mismo nombre.

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

- **Entrada**: `familyId`, `categoryId`, `tagId`, `newName`.
- **Flujo principal**: análogo a `RenameCategory`, operando sobre el `Tag` dentro de la `Category`.
- **Errores posibles**: `CategoryNotFoundError`, `TagNotFoundError`, `InvalidTagNameError`, `DuplicateTagNameError`.
- **Eventos disparados**: ninguno definido (mismo pendiente que `RenameCategory`).

---

### 13. DeleteTag

Elimina físicamente un tag, usando `TagDeletionService`.

- **Entrada**: `familyId`, `categoryId`, `tagId`.
- **Flujo principal**: análogo a `DeleteCategory`, usando `TagDeletionService.delete(tag)` (consulta `FinancialItemRepository.countByTag()`).
- **Errores posibles**: `CategoryNotFoundError`, `TagNotFoundError`, `TagHasAssociatedItemsError`.
- **Eventos disparados**: ninguno definido.

---

### 14. DeprecateTag

- **Entrada**: `familyId`, `categoryId`, `tagId`.
- **Flujo principal**: análogo a `DeprecateCategory`, invocando `tag.deprecate()`.
- **Errores posibles**: `CategoryNotFoundError`, `TagNotFoundError`.
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
- **Entrada**: `familyId`, `includeDeprecated` (opcional, default `false`).
- **Flujo principal**:
  1. Se consulta `CategoryRepository.findByFamilyId()`.
  2. Se filtran las deprecadas si `includeDeprecated` es `false`.
  3. Se devuelve la lista (cada categoría con sus tags, ya ordenados por `displayOrder`).
- **Errores posibles**: ninguno propio.

---

## Resumen de errores nuevos a definir

| Error | Casos de uso donde aparece | ¿Ya existe? |
|---|---|---|
| `FinancialItemNotFoundError` | UpdateFinancialItemAmount, ReclassifyFinancialItem, DeleteFinancialItem | ❌ nuevo |
| `InsufficientRoleError` (propio de `Financial Tracking`) | CreateCategory, ReactivateCategory, RenameCategory,DeleteCategory, DeprecateCategory | ❌ nuevo |
| `CategoryNotFoundError` | Varios | ❌ nuevo |
| `CategoryNotActiveError` | CreateFinancialItem, ReclassifyFinancialItem, AddTagToCategory | ❌ nuevo |
| `TagNotFoundError` | Varios | ❌ nuevo |
| `TagNotActiveError` | CreateFinancialItem, ReclassifyFinancialItem | ❌ nuevo |
| `TagDoesNotBelongToCategoryError` | CreateFinancialItem, ReclassifyFinancialItem | ❌ nuevo |
| `DuplicateCategoryNameError` | CreateCategory, RenameCategory | ❌ nuevo |
| `DuplicateTagNameError` | AddTagToCategory, RenameTag | ❌ nuevo |
| `InvalidTagOrderError` | ReorderCategoryTags | ❌ nuevo |
| `CategoryHasAssociatedItemsError` | DeleteCategory | ✅ ya definido |
| `TagHasAssociatedItemsError` | DeleteTag | ✅ ya definido |
| `InvalidMoneyError`, `InvalidTitleError`, `InvalidNoteError`, `FutureTransactionDateError`, `InvalidCategoryNameError`, `InvalidTagNameError` | CreateFinancialItem y afines | ✅ ya definidos |

## Pendientes antes de implementar

1. **Permisos**: a diferencia de `Family & Access` (donde casi todo requería `Owner`), aquí no está definido qué rol puede hacer qué para la mayoría de los casos de uso. La especificación original sugiere que cualquier miembro puede registrar/consultar — pero ¿cualquier miembro puede editar o eliminar un movimiento que registró *otro* miembro? Ya **decidido**: `CreateCategory`, `ReactivateCategory`, `RenameCategory`, `DeleteCategory` y `DeprecateCategory` restringidos a `Owner`; `AddTagToCategory` y `ReorderCategoryTags` permitidos para cualquier `Member`; pendiente definir el resto (tags de renombrado/borrado, etc.).
2. **Eventos de renombrado**: `RenameCategory`/`RenameTag` no tienen evento definido en el catálogo original del proyecto — hay que decidir si `Reporting` y `AI Assistance` (`MerchantCategoryHistory`) necesitan enterarse de un cambio de nombre para no mostrar/usar el nombre viejo.
3. **`DeleteCategory`/`DeleteTag` sin evento**: a confirmar si esto es correcto (por definición, una categoría eliminable nunca tuvo items, así que no debería haber nada que revertir en otros contextos) o si igual conviene emitir un evento por auditoría.
4. **`AddTagToCategory` sobre categoría deprecada**: **decidido** — se rechaza con `CategoryNotActiveError`; una categoría debe reactivarse primero (`ReactivateCategory`) antes de poder agregarle tags nuevos.
5. **Estrategia de borrado de `FinancialItem`**: `DeleteFinancialItem` — ¿borrado físico o soft-delete (campo `deletedAt`)? Afecta directamente cómo se implementa `FinancialItemRepository.delete()` y si `GetFinancialItems` necesita excluir eliminados.
6. **Resolución de `Currency` por defecto**: `CreateFinancialItem` necesita leer `family.defaultCurrency` cuando no se especifica moneda explícita — esto acopla el caso de uso de `Financial Tracking` a una consulta hacia `Family & Access` (mismo patrón que `CategoryLookupPort` que ya usa `AI Assistance`, pero en sentido inverso).