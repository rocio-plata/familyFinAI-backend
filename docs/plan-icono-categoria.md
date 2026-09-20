# Plan de implementación — Ícono en Categorías

## Resumen

Se agrega un campo `icon` a `Category`: una clave de texto (no una imagen ni un recurso de UI) tomada de un catálogo de íconos acordado entre backend y frontend. Se guarda en el backend para que todos los miembros de una familia vean el mismo ícono para la misma categoría, sin importar el dispositivo.

**Aclaración de alcance**: `Category` sí tiene categorías predefinidas — ya implementaste `CreateDefaultCategoriesOnFamilyCreatedEventHandler`, que reacciona a `FamilyCreated` y crea 9 categorías de tipo `Expense` (Comestibles, Salud, Restaurantes, Servicios, Compras, Regalos, Familia, Tiempo Libre, Transporte) si todavía no existen. Este plan agrega el campo `icon` a `Category` en general — las categorías predefinidas nacen igual que cualquier otra, con `icon = null` (ver decisión 2), coherente con que el catálogo de íconos todavía no está definido.

**Estado de implementación (2026-09-20)**: los puntos 1–8 y 10 están implementados, cubiertos por pruebas unitarias, de integración y E2E, y expuestos por HTTP. El punto 9 (colección de Postman) sigue pendiente.

---

## Decisiones de diseño

### 1. `icon` es un string opaco, sin catálogo validado en el backend

El backend **no** valida contra una lista cerrada de íconos permitidos — solo aplica una validación de forma (no vacío si se especifica, longitud razonable). El catálogo de íconos disponibles (qué claves existen, qué se ve cada una) vive enteramente en el frontend.

**Por qué**: si el backend tuviera que conocer el catálogo completo (un enum con cada ícono válido), cada vez que el equipo de frontend quisiera agregar un ícono nuevo habría que tocar también el backend — acoplamiento innecesario. Guardar un string libre mantiene ambos lados independientes: el backend solo persiste y devuelve el dato, el frontend decide qué hacer con él (y si recibe una clave que no reconoce, puede mostrar un ícono genérico de fallback, sin que eso sea un error del backend).

### 2. `icon` es opcional y nace vacío (`null`)

Toda categoría nueva (ya sea creada ahora o en el pasado, para las que ya existan) empieza sin ícono asignado — coherente con que "el catálogo de íconos se definirá más adelante". El campo se puede completar/editar después, en cualquier momento.

### 3. Cambiar el ícono se une a `RenameCategory`, que pasa a ser `UpdateCategory`

Mismo criterio que ya aplicamos con `UpdateFinancialItem` (campos simples de edición que no tienen invariantes cruzadas se agrupan en un solo caso de uso, en vez de uno por campo). Se renombra el caso de uso existente `RenameCategoryUseCase` a `UpdateCategoryUseCase`, aceptando `newName` y/o `newIcon`, ambos opcionales — solo se aplican los campos presentes en la entrada. La ruta HTTP (`PATCH /families/:familyId/categories/:categoryId`) no cambia, solo se amplía el body que acepta.

### 4. La migración es aditiva — no hace falta `db:reset` esta vez

A diferencia de agregar `type` a `Category` (que era `NOT NULL` y forzaba perder los datos existentes), `icon` es **nullable** — se puede agregar la columna sin tocar las filas existentes, todas quedan con `icon = NULL` automáticamente. `npm run db:generate` + `npm run db:migrate` alcanza, sin necesidad de `db:reset`.

---

## Cambios en el dominio

### Value Object nuevo: `CategoryIcon`

```typescript
// contexts/financial-tracking/domain/value-objects/category-icon.ts
const MAX_ICON_LENGTH = 40;

class CategoryIcon {
  private constructor(private readonly value: string) {}

  static of(value: string): CategoryIcon {
    const trimmed = value.trim();
    if (trimmed.length === 0) throw new InvalidCategoryIconError("La clave de ícono no puede estar vacía");
    if (trimmed.length > MAX_ICON_LENGTH) {
      throw new InvalidCategoryIconError(`La clave de ícono no puede superar ${MAX_ICON_LENGTH} caracteres`);
    }
    return new CategoryIcon(trimmed);
  }

  toString(): string { return this.value; }
  equals(other: CategoryIcon): boolean { return this.value === other.value; }
}

export { CategoryIcon };
```

### Error nuevo

```typescript
// contexts/financial-tracking/domain/errors/invalid-category-icon.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidCategoryIconError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.INVALID_CATEGORY_ICON";

  constructor(reason: string) {
    super(reason);
  }
}

export { InvalidCategoryIconError };
```

### `Category` — actualizada

```typescript
// contexts/financial-tracking/domain/entities/category.ts
class Category {
  private constructor(
    private readonly _id: CategoryId,
    private readonly _familyId: FamilyId,
    private readonly _type: FinancialItemType,
    private _name: CategoryName,
    private _icon: CategoryIcon | null,   // NUEVO
    private _status: CategoryStatus,
    private _tags: Tag[],
  ) {}

  get icon(): CategoryIcon | null { return this._icon; }
  // ... resto de getters sin cambios

  static create(familyId: FamilyId, type: FinancialItemType, name: CategoryName, icon?: CategoryIcon): Category {
    return new Category(CategoryId.generate(), familyId, type, name, icon ?? null, CategoryStatus.Active, []);
  }

  static reconstitute(props: ReconstituteCategoryProps): Category {
    return new Category(
      CategoryId.of(props.id),
      FamilyId.of(props.familyId),
      props.type,
      CategoryName.of(props.name),
      props.icon ? CategoryIcon.of(props.icon) : null,
      props.status === "ACTIVE" ? CategoryStatus.Active : CategoryStatus.Deprecated,
      props.tags.map((t) => Tag.reconstitute(t)),
    );
  }

  rename(newName: CategoryName): void { this._name = newName; }

  updateIcon(newIcon: CategoryIcon | null): void {
    this._icon = newIcon;   // permite tanto asignar como quitar el ícono (pasando null)
  }

  // addTag(), reorderTags(), deprecate(), reactivate() sin cambios
}
```

---

## Casos de uso afectados

### `CreateCategoryUseCase`

- **Entrada ampliada**: `icon` opcional (string). Si viene, se valida con `CategoryIcon.of()`; si no, la categoría se crea con `icon = null`.

### `RenameCategoryUseCase` → `UpdateCategoryUseCase` (renombrado y ampliado)

- **Entrada**: `familyId`, `categoryId`, `newName` (opcional), `newIcon` (opcional — puede ser un string para asignar/cambiar, o `null` explícito para quitarlo).
- **Flujo**: busca la `Category`, aplica `rename()` si vino `newName`, aplica `updateIcon()` si vino `newIcon` (incluyendo el caso `null`).
- **Errores posibles**: los que ya tenía `RenameCategory` (`CategoryNotFoundError`, `InvalidCategoryNameError`, `DuplicateCategoryNameError`), más `InvalidCategoryIconError`.

---

## Base de datos

```typescript
// contexts/financial-tracking/infrastructure/persistence/schema.ts
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id").notNull(),
  type: itemTypeEnum("type").notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  icon: varchar("icon", { length: 40 }),   // NUEVO — nullable, sin default
  status: categoryStatusEnum("status").notNull().default("ACTIVE"),
});
```

Migración: `npm run db:generate` (Drizzle Kit debería generar un simple `ALTER TABLE categories ADD COLUMN icon varchar(40);`) → `npm run db:migrate`. No hace falta `db:reset` — las categorías que ya tengas creadas de pruebas anteriores no se pierden, solo quedan con `icon = NULL`.

---

## Endpoints HTTP afectados

- `POST /families/:familyId/categories` (`CreateCategory`) — agregar `icon` opcional al body/schema.
- `PATCH /families/:familyId/categories/:categoryId` — mismo endpoint que ya existía para `RenameCategory`, ahora respaldado por `UpdateCategoryUseCase`; el body admite `newName` y/o `newIcon`, ambos opcionales.
- `GET /families/:familyId/categories` (`GetCategories`) — el DTO de respuesta de cada categoría incluye `icon` (puede venir `null`).

---

## Plan de implementación (orden sugerido, con TDD)

1. ~~**`CategoryIcon`** — Value Object con tests (vacío rechazado, largo máximo, `of()` válido).~~ ✅
2. ~~**`InvalidCategoryIconError`** — clase completa.~~ ✅
3. ~~**`Category`** — agregar `_icon`, getter, `updateIcon()`, ajustar `create()`/`reconstitute()`, con tests actualizados y nuevos (crear sin ícono, crear con ícono, actualizar ícono, quitar ícono con `null`).~~ ✅
4. ~~**Renombrar `RenameCategoryUseCase` → `UpdateCategoryUseCase`** — ampliar la entrada, actualizar todos los tests existentes de este caso de uso al nuevo nombre/firma, agregar tests del campo `icon`.~~ ✅
5. ~~**`CreateCategoryUseCase`** — agregar `icon` opcional a la entrada, actualizar tests.~~ ✅
6. ~~**Schema de Drizzle** — agregar la columna, `npm run db:generate`, revisar el SQL generado (debería ser un `ALTER TABLE` simple), `npm run db:migrate`.~~ ✅ — migración `0007_funny_sleepwalker.sql` aditiva y aplicada.
7. ~~**`DrizzleCategoryRepository`** — actualizar `toDomain()`/`toPersistence()` para incluir `icon`.~~ ✅
8. ~~**Rutas HTTP** — actualizar el schema de `POST .../categories` y `PATCH .../categories/:categoryId`, actualizar el DTO de `GetCategories`.~~ ✅
9. **Actualizar la colección de Postman** — agregar `icon` opcional a `Create Category`, agregar un request de ejemplo actualizando el ícono vía el endpoint renombrado.
10. ~~**Actualizar `casos-de-uso-financial-tracking.md`** con el campo nuevo y el renombre de caso de uso.~~ ✅

## Pendientes que quedan abiertos

1. **Catálogo de íconos**: queda pendiente definir qué claves existen (ej. `"shopping_cart"`, `"car"`, `"home"`, etc.) y documentarlas como contrato compartido entre frontend y backend — no es responsabilidad del backend mantenerlo, pero sí conviene que exista un documento de referencia en algún lado del proyecto para que frontend y quien pruebe la API usen las mismas claves.
2. **¿Se les asigna ícono a las 9 categorías predefinidas cuando se defina el catálogo?** Por ahora nacen con `icon = null`, igual que cualquier categoría — pero una vez que exista el catálogo de íconos (pendiente #1), probablemente valga la pena actualizar `CreateDefaultCategoriesOnFamilyCreatedEventHandler` para que les asigne un ícono razonable desde el momento en que se crean (ej. un carrito para "Comestibles", un auto para "Transporte"), en vez de dejarlas sin ícono para siempre. No es parte de este plan, pero es el ajuste natural que sigue.
3. **Íconos para `Tag`**: este plan es solo para `Category`. Si más adelante quieres lo mismo para `Tag`, sería una extensión simétrica, no incluida acá.
