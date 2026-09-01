# Financial Tracking — Casos de uso

Documentación de los casos de uso del contexto `Financial Tracking` (core domain), previa a su implementación. Sigue la misma convención usada en `casos-de-uso-family-access.md`: **actor**, **precondiciones**, **flujo principal**, **flujos alternativos/errores**, **eventos de dominio disparados**.

Basado en las entidades y value objects ya definidos: `FinancialItem`, `Category`, `Tag`, `CategoryAssignment`, `Money`, `TransactionDate`, `Title`, `Note`, `FinancialItemType`, `CategoryStatus`/`TagStatus`, y los Domain Services `CategoryDeletionService`/`TagDeletionService`.
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

### 2. UpdateFinancialItemAmount

Corrige el monto de un movimiento ya registrado.

- **Actor**: el `Member` que registró el item, o cualquier `Member` con permisos suficientes (a definir — ver pendientes).
- **Precondiciones**: el `FinancialItem` existe y pertenece a la familia del solicitante.
- **Entrada**: `familyId`, `itemId`, `newAmount`.
- **Flujo principal**:
  1. Se busca el `FinancialItem`, validando que pertenezca a la familia.
  2. Se valida `newAmount` como `Money`.
  3. Se invoca `item.updateAmount(newAmount)`.
  4. Se persiste.
- **Errores posibles**: `FinancialItemNotFoundError`, `InvalidMoneyError`.
- **Eventos disparados**: `ItemAmountChanged`.

---

### 3. ReclassifyFinancialItem

Cambia la categoría y/o tag de un movimiento.

- **Actor**: mismo criterio que `UpdateFinancialItemAmount`.
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

- **Actor**: mismo criterio que `UpdateFinancialItemAmount`.
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

- **Actor**: cualquier `Member` (a confirmar si se restringe a `Owner` — ver pendientes).
- **Precondiciones**: la familia existe; no existe ya una categoría con el mismo nombre (comparación case-insensitive, según la regla que definimos en `CategoryName.equals()`).
- **Entrada**: `familyId`, `name`.
- **Flujo principal**:
  1. Se valida `name` como `CategoryName`.
  2. Se verifica que no exista otra categoría activa con el mismo nombre en la familia.
  3. Se invoca `Category.create(familyId, name)`.
  4. Se persiste.
- **Errores posibles**: `InvalidCategoryNameError`, `DuplicateCategoryNameError`.
- **Eventos disparados**: `CategoryCreated`.

---

### 6. RenameCategory

Renombra una categoría existente.

- **Entrada**: `familyId`, `categoryId`, `newName`.
- **Flujo principal**:
  1. Se busca la `Category`.
  2. Se valida `newName` y que no colisione con otra categoría existente.
  3. Se invoca `category.rename(newName)`.
  4. Se persiste.
- **Errores posibles**: `CategoryNotFoundError`, `InvalidCategoryNameError`, `DuplicateCategoryNameError`.
- **Eventos disparados**: ninguno definido — a evaluar si `Reporting`/`AI Assistance` necesitan reaccionar a un renombrado (probablemente sí, para no mostrar el nombre viejo en reportes históricos o en `MerchantCategoryHistory`).

---

### 7. DeleteCategory

Elimina físicamente una categoría, usando `CategoryDeletionService`.

- **Entrada**: `familyId`, `categoryId`.
- **Flujo principal**:
  1. Se busca la `Category`.
  2. Se invoca `CategoryDeletionService.delete(category)` — internamente consulta `FinancialItemRepository.countByCategory()`.
  3. Si no tiene items asociados, se elimina; si tiene, se rechaza.
- **Errores posibles**: `CategoryNotFoundError`, `CategoryHasAssociatedItemsError`.
- **Eventos disparados**: ninguno definido (a diferencia de `CategoryDeprecated`, que sí está en el catálogo original — ver pendientes, puede que `DeleteCategory` no necesite evento propio ya que, por definición, nunca tuvo items ni afectó reportes).

---

### 8. DeprecateCategory

Marca una categoría como no disponible para nuevos registros, preservando el histórico.

- **Entrada**: `familyId`, `categoryId`.
- **Flujo principal**:
  1. Se busca la `Category`.
  2. Se invoca `category.deprecate()` (siempre permitido, sin chequeo de items).
  3. Se persiste.
- **Errores posibles**: `CategoryNotFoundError`.
- **Eventos disparados**: `CategoryDeprecated` (consumido por `AI Assistance`, para no sugerir categorías deprecadas).

---

### 9. AddTagToCategory

Agrega un tag nuevo dentro de una categoría.

- **Entrada**: `familyId`, `categoryId`, `tagName`.
- **Flujo principal**:
  1. Se busca la `Category`, validando que esté `Active` (¿se puede agregar un tag a una categoría deprecada? — ver pendientes).
  2. Se valida `tagName` y que no colisione con otro tag existente en esa categoría.
  3. Se invoca `category.addTag(tagName)` (agrega al final, con el siguiente `displayOrder`).
  4. Se persiste.
- **Errores posibles**: `CategoryNotFoundError`, `InvalidTagNameError`, `DuplicateTagNameError`.
- **Eventos disparados**: `TagCreated`.

---

### 10. ReorderCategoryTags

Reordena los tags de una categoría según la preferencia manual del usuario.

- **Entrada**: `familyId`, `categoryId`, `orderedTagIds` (array completo de `TagId` en el nuevo orden).
- **Flujo principal**:
  1. Se busca la `Category`.
  2. Se invoca `category.reorderTags(orderedTagIds)` — valida que el array contenga exactamente los mismos tags que ya tiene la categoría, y reasigna `displayOrder` según la posición.
  3. Se persiste.
- **Errores posibles**: `CategoryNotFoundError`, `InvalidTagOrderError` (nuevo — el array no coincide con los tags actuales de la categoría).
- **Eventos disparados**: ninguno.

---

## Tag

### 11. RenameTag

- **Entrada**: `familyId`, `categoryId`, `tagId`, `newName`.
- **Flujo principal**: análogo a `RenameCategory`, operando sobre el `Tag` dentro de la `Category`.
- **Errores posibles**: `CategoryNotFoundError`, `TagNotFoundError`, `InvalidTagNameError`, `DuplicateTagNameError`.
- **Eventos disparados**: ninguno definido (mismo pendiente que `RenameCategory`).

---

### 12. DeleteTag

Elimina físicamente un tag, usando `TagDeletionService`.

- **Entrada**: `familyId`, `categoryId`, `tagId`.
- **Flujo principal**: análogo a `DeleteCategory`, usando `TagDeletionService.delete(tag)` (consulta `FinancialItemRepository.countByTag()`).
- **Errores posibles**: `CategoryNotFoundError`, `TagNotFoundError`, `TagHasAssociatedItemsError`.
- **Eventos disparados**: ninguno definido.

---

### 13. DeprecateTag

- **Entrada**: `familyId`, `categoryId`, `tagId`.
- **Flujo principal**: análogo a `DeprecateCategory`, invocando `tag.deprecate()`.
- **Errores posibles**: `CategoryNotFoundError`, `TagNotFoundError`.
- **Eventos disparados**: `TagDeprecated`.

---

## Queries

### 14. GetFinancialItems

Lista y filtra los movimientos financieros de la familia — corresponde a la "Consulta de items" de la especificación original.

- **Actor**: cualquier `Member` de la familia.
- **Entrada**: `familyId`, y filtros opcionales: `period` (rango de fechas), `categoryId`, `tagId`, `type` (Expense/Income).
- **Flujo principal**:
  1. Se consulta `FinancialItemRepository` con los filtros dados.
  2. Se devuelve la lista mapeada a DTO.
- **Errores posibles**: ninguno propio (una familia sin movimientos devuelve lista vacía).

---

### 15. GetCategories

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
| `CategoryNotFoundError` | Varios | ❌ nuevo |
| `CategoryNotActiveError` | CreateFinancialItem, ReclassifyFinancialItem | ❌ nuevo |
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

1. **Permisos**: a diferencia de `Family & Access` (donde casi todo requería `Owner`), aquí no está definido qué rol puede hacer qué. La especificación original sugiere que cualquier miembro puede registrar/consultar — pero ¿cualquier miembro puede editar o eliminar un movimiento que registró *otro* miembro? ¿Cualquiera puede crear/eliminar categorías, o eso queda reservado a `Owner`?
2. **Eventos de renombrado**: `RenameCategory`/`RenameTag` no tienen evento definido en el catálogo original del proyecto — hay que decidir si `Reporting` y `AI Assistance` (`MerchantCategoryHistory`) necesitan enterarse de un cambio de nombre para no mostrar/usar el nombre viejo.
3. **`DeleteCategory`/`DeleteTag` sin evento**: a confirmar si esto es correcto (por definición, una categoría eliminable nunca tuvo items, así que no debería haber nada que revertir en otros contextos) o si igual conviene emitir un evento por auditoría.
4. **`AddTagToCategory` sobre categoría deprecada**: ¿se permite agregar tags nuevos a una categoría ya deprecada, o debería rechazarse?
5. **Estrategia de borrado de `FinancialItem`**: `DeleteFinancialItem` — ¿borrado físico o soft-delete (campo `deletedAt`)? Afecta directamente cómo se implementa `FinancialItemRepository.delete()` y si `GetFinancialItems` necesita excluir eliminados.
6. **Resolución de `Currency` por defecto**: `CreateFinancialItem` necesita leer `family.defaultCurrency` cuando no se especifica moneda explícita — esto acopla el caso de uso de `Financial Tracking` a una consulta hacia `Family & Access` (mismo patrón que `CategoryLookupPort` que ya usa `AI Assistance`, pero en sentido inverso).
