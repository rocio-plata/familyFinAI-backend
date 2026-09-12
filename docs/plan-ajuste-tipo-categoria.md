# Plan de reajuste — El tipo (Gasto/Ingreso) pertenece a la Categoría

> Estado: plan ejecutado. El modelo, casos de uso, rutas, persistencia y tests ya reflejan que
> `Category.type` es la fuente de verdad para el tipo del movimiento.

## El error de diseño

Hasta ahora, `FinancialItemType` (`Expense`/`Income`) era un campo independiente de `FinancialItem`, elegido libremente al crear el movimiento, sin ninguna relación con su `Category`. Esto permite inconsistencias reales: nada impide crear un item de tipo `Income` con la categoría `"Supermercado"`, o tener la misma categoría usada indistintamente para gastos e ingresos.

**La corrección**: el tipo es una propiedad de la **categoría**, no del item. `"Sueldo"` es intrínsecamente una categoría de ingreso; `"Supermercado"` es intrínsecamente de gasto. Un `FinancialItem` **hereda** su tipo de la categoría a la que pertenece — no se elige por separado.

Esto habilita directamente el requisito de producto: una pantalla que lista solo categorías de gasto, y otra que lista solo categorías de ingreso.

---

## Decisión de diseño: ¿se seguirá guardando `type` en `FinancialItem`?

**Sí, pero como copia derivada, nunca como entrada independiente del usuario.** Al crear un `FinancialItem`, el caso de uso resuelve el tipo desde la `Category` (`category.type`) y lo guarda en el item — se mantiene la columna/campo por rendimiento de lectura (evita un `JOIN` en cada consulta de `GetFinancialItems`/reportes), pero **deja de ser un dato que el usuario pueda elegir o contradecir**. La fuente de verdad sigue siendo la categoría.

## Decisión de diseño: `Category.type` es inmutable

Una vez creada una categoría como `Expense` o `Income`, **no se puede cambiar**. Cambiar el tipo de una categoría que ya tiene items asociados dejaría esos items con un tipo histórico inconsistente con la categoría actual — mismo criterio que ya aplicamos con "no se puede eliminar una categoría con items" (`CategoryDeletionService`), pero aquí ni siquiera se ofrece la opción de editar el tipo, directamente no existe `changeType()` en la entidad.

## Decisión de diseño: reclasificar no puede cambiar el tipo de un item

Si `ReclassifyFinancialItem` permitiera mover un item a una categoría de tipo distinto (mover un gasto a una categoría de ingreso), el item "cambiaría de tipo" de forma implícita y confusa. **Se restringe**: solo se puede reclasificar hacia una categoría del **mismo tipo** que la categoría actual del item.

---

## Cambios en el dominio

### `Category` — nuevo campo inmutable

```typescript
// contexts/financial-tracking/domain/entities/category.ts
class Category {
  private constructor(
    private readonly _id: CategoryId,
    private readonly _familyId: FamilyId,
    private readonly _type: FinancialItemType,   // NUEVO — inmutable, sin setter
    private _name: CategoryName,
    private _status: CategoryStatus,
    private _tags: Tag[],
  ) {}

  get type(): FinancialItemType { return this._type; }
  // ... resto de getters sin cambios

  static create(familyId: FamilyId, type: FinancialItemType, name: CategoryName): Category {
    return new Category(CategoryId.generate(), familyId, type, name, CategoryStatus.Active, []);
  }

  // rename(), addTag(), reorderTags(), deprecate(), reactivate() sin cambios
  // NO se agrega ningún changeType() — el tipo es inmutable de por vida
}
```

### `FinancialItem` — el tipo deja de ser un input libre

```typescript
// contexts/financial-tracking/domain/entities/financial-item.ts
interface CreateFinancialItemProps {
  familyId: FamilyId;
  recordedBy: UserId;
  // type ya NO se recibe aquí — se resuelve a partir de la categoría en el caso de uso
  amount: Money;
  category: CategoryAssignment;
  title: Title;
  note?: Note;
  occurredOn: TransactionDate;
}

class FinancialItem {
  // El campo _type se mantiene internamente, pero ya no es parte del input de create().
  // El VALOR se lo pasa el caso de uso, resuelto desde category.type, no el usuario final.

  static create(props: CreateFinancialItemProps, resolvedType: FinancialItemType): FinancialItem {
    const item = new FinancialItem(
      FinancialItemId.generate(),
      props.familyId,
      props.recordedBy,
      resolvedType,          // viene de la categoría, no de props
      props.amount,
      props.category,
      props.title,
      props.note ?? null,
      props.occurredOn,
      new Date(),
    );
    item.domainEvents.push(new ItemRecorded(/* ... incluye resolvedType ... */));
    return item;
  }

  // reclassify() se ajusta para validar mismo tipo (ver más abajo)
}
```

**Nota de diseño**: pasar `resolvedType` como segundo parámetro de `create()` (en vez de meterlo dentro de `CreateFinancialItemProps`) deja explícito, con el propio tipo de la función, que el tipo no es un campo más del formulario — es algo que el caso de uso resuelve y le entrega a la entidad, no algo que la entidad reciba mezclado con el resto de la entrada del usuario.

### `reclassify()` — valida que el tipo no cambie

```typescript
reclassify(newCategory: CategoryAssignment, newCategoryType: FinancialItemType): void {
  if (newCategoryType !== this.type) {
    throw new CannotReclassifyAcrossTypesError(this.type, newCategoryType);
  }
  this.category = newCategory;
  this.domainEvents.push(new ItemReclassified(/* ... */));
}
```

---

## Casos de uso afectados

### `CreateCategory` — ahora requiere `type`

- **Entrada nueva**: `familyId`, `type` (`Expense` | `Income`), `name`.
- El `type` es obligatorio y no tiene valor por defecto (a diferencia de `FinancialItem.type`, que sí defaulteaba a `Expense` — aquí no aplica, forzar al usuario a elegir explícitamente evita categorías ambiguas).

### `CreateFinancialItem` — ya no recibe `type`

- **Entrada actualizada**: se quita `type` de la entrada. El flujo pasa a:
  1. Buscar la `Category` por `categoryId` (ya se hacía, para validar que exista y esté activa).
  2. Tomar `category.type` como el tipo resuelto.
  3. Pasarlo a `FinancialItem.create(props, category.type)`.
- **Impacto en el documento de casos de uso** (`casos-de-uso-financial-tracking.md`): actualizar la sección 1 para reflejar que `type` ya no es parte de la entrada.

### `ReclassifyFinancialItem` — nueva validación

- Al resolver la nueva categoría, comparar su `type` contra `item.type` **antes** de invocar `item.reclassify()`.
- **Nuevo error**: `CannotReclassifyAcrossTypesError`.

### `GetCategories` — nuevo filtro por tipo

- **Entrada ampliada**: `type` opcional (`Expense` | `Income`). Si se especifica, solo devuelve categorías de ese tipo — es la query que alimenta directamente las dos pantallas nuevas ("categorías de gasto" / "categorías de ingreso").
- Si se omite, se mantiene el comportamiento actual (todas, salvo `includeDeprecated`).

### `GetFinancialItems` — sin cambios funcionales

Como `FinancialItem.type` se sigue guardando (derivado, no libre), el filtro por `type` que ya existía sigue funcionando exactamente igual — la fuente del dato cambió, no el comportamiento de la query.

---

## Nuevo error

```typescript
// contexts/financial-tracking/domain/errors/cannot-reclassify-across-types.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class CannotReclassifyAcrossTypesError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.CANNOT_RECLASSIFY_ACROSS_TYPES";

  constructor(currentType: string, targetType: string) {
    super(`No se puede reclasificar un item de tipo '${currentType}' hacia una categoría de tipo '${targetType}'`);
  }
}

export { CannotReclassifyAcrossTypesError };
```

---

## Cambios en la base de datos

### `categories` — nueva columna

```typescript
// contexts/financial-tracking/infrastructure/persistence/schema.ts
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id").notNull(),
  type: itemTypeEnum("type").notNull(),   // NUEVO — reutiliza el mismo enum que ya usa financial_items
  name: varchar("name", { length: 50 }).notNull(),
  status: categoryStatusEnum("status").notNull().default("ACTIVE"),
});
```

`financial_items.type` **no cambia de forma** (sigue siendo la misma columna) — solo cambia de dónde viene el valor que se escribe ahí.

### Migración con datos existentes (si ya tienes categorías creadas en tu Postgres local)

Como `type` en `categories` va a ser `NOT NULL`, y ya tienes filas existentes (según confirmamos hace poco, `families`, `categories`, `tags` ya tienen datos reales), la migración generada por Drizzle va a fallar o pedir un valor por defecto si no se maneja explícitamente. Opciones:

1. **Si son solo datos de prueba** (lo más probable en este punto del proyecto): usar `db:reset` para partir de cero después de aplicar el nuevo schema — la opción más simple.
2. **Si quieres conservar los datos**: la migración necesita un paso intermedio — agregar la columna como nullable primero, hacer un `UPDATE` manual asignando un tipo a cada categoría existente (inferido de los items que ya tiene, o a mano), y luego alterar la columna a `NOT NULL` en una segunda migración.

---

## Impacto en contextos que dependen de `Financial Tracking` (a revisar, no bloqueante ahora mismo)

1. **`Budgeting`**: `CreateBudgetConfiguration` no valida hoy que la categoría sea de tipo `Expense` — conceptualmente, un presupuesto solo tiene sentido para gastos (según la especificación original). Con `Category.type` ya explícito, esto se puede (y probablemente deba) validar ahora con un nuevo error `CannotBudgetIncomeCategoryError`. **No implementado en este plan** — queda como ajuste natural a aplicar cuando se retome `Budgeting`.
2. **`Reporting`**: `CategoryPeriodAggregate` hoy tiene `totalExpense` **y** `totalIncome` en la misma fila, pensado para cuando el tipo era ambiguo por categoría. Con el tipo fijo por categoría, cada agregado en la práctica solo va a usar uno de los dos campos (el otro siempre en cero) — podría simplificarse a un único campo `total`, pero **no es necesario para que funcione**, solo redundante. Simplificación opcional, no bloqueante.

---

## Plan de implementación ejecutado (referencia histórica)

1. **`FinancialItemType`**: sin cambios (sigue siendo el mismo enum, solo cambia quién lo posee).
2. **`Category`**: agregar el campo `type` al constructor y a `create()`, con test unitario confirmando que `category.type` queda fijo y que no existe forma de cambiarlo.
3. **`CannotReclassifyAcrossTypesError`**: crear la clase.
4. **`FinancialItem.reclassify()`**: agregar el parámetro `newCategoryType` y la validación, con tests cubriendo el caso permitido (mismo tipo) y el rechazado (`CannotReclassifyAcrossTypesError`).
5. **`FinancialItem.create()`**: ajustar la firma para recibir `resolvedType` aparte de `props`, actualizando el único caso de uso que la invoca.
6. **`CreateCategoryUseCase`**: agregar `type` a la entrada, actualizar tests existentes.
7. **`CreateFinancialItemUseCase`**: quitar `type` de la entrada, resolverlo desde `category.type`, actualizar tests existentes.
8. **`ReclassifyFinancialItemUseCase`**: resolver el `type` de la nueva categoría y pasarlo a `item.reclassify()`, agregar test cubriendo el rechazo cruzado de tipos.
9. **`GetCategoriesQuery`**: agregar el filtro opcional `type`.
10. **Schema de Drizzle** (`categories.type`): agregar la columna, generar migración, decidir estrategia de datos existentes (reset vs. migración con `UPDATE` manual).
11. **Rutas HTTP afectadas**: `POST /families/:familyId/categories` (agregar `type` al body/schema), `POST /families/:familyId/items` (quitar `type` del body/schema), `PATCH /families/:familyId/items/:itemId/category` (sin cambios en el body, pero ahora puede devolver 409/400 por `CannotReclassifyAcrossTypesError`), `GET /families/:familyId/categories` (agregar `type` como query param opcional).
12. **Colección de Postman**: actualizar los requests `Create Category`, `Create Financial Item` y `Reclassify Financial Item` para reflejar los nuevos contratos.
13. **Actualizar `casos-de-uso-financial-tracking.md`** con los cambios de entrada en `CreateCategory`, `CreateFinancialItem`, `ReclassifyFinancialItem` y `GetCategories`.

## Mejoras opcionales que quedan abiertas tras este ajuste

1. **Validar que `Budgeting` solo acepte categorías de tipo `Expense`** — ✅ implementado en `CreateBudgetConfiguration` mediante `CategoryNotExpenseError`.
2. **Simplificar `CategoryPeriodAggregate`** en `Reporting` (un solo campo `total` en vez de `totalExpense`/`totalIncome`) — mejora opcional, no urgente.
3. **Migración de datos existentes** — resuelta para el flujo actual mediante reset de la base de datos; un entorno que necesite conservar datos antiguos requerirá una migración específica.
