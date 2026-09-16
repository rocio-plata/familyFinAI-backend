# Plan de implementación — Medios de Pago (v2: alcance por usuario)

## Resumen

`PaymentMethod` vive en `Financial Tracking`, pero **pertenece al usuario, no a la familia**. Cada usuario tiene su propia lista (4 por defecto al registrarse, más los que agregue), con uno marcado como **predeterminado** — se asigna automáticamente a un `FinancialItem` nuevo si no se especifica otro, editable tanto por item como desde la configuración general del usuario. Los reportes de una familia agrupan por **nombre** (no por ID individual), ya que dos miembros pueden tener cada uno su propio "Efectivo" con IDs distintos.

Esta es una revisión de la v1 del plan (que asumía alcance por familia) — varias decisiones cambian en cascada.

---

## Decisiones de diseño

### 1. `PaymentMethod` scoped por `userId`, no por `familyId`

Sigue viviendo en `Financial Tracking` (es un concepto financiero, misma familia conceptual que `Category`/`Tag`), pero su dueño es el usuario. `FinancialItem` ya referencia `recordedBy: UserId`, así que este contexto ya conocía el concepto de usuario — no es una dependencia nueva.

**Consecuencia directa**: dos miembros de la misma familia tienen **listas de medios de pago completamente independientes**. Si ambos crean uno llamado "Efectivo", son dos `PaymentMethod` distintos (IDs distintos), cada uno solo visible/usable por su dueño.

### 2. Se crean al registrarse, no al crear una familia

Mismo patrón event-driven que ya usamos (contexto downstream reaccionando a un evento, sin dependencia circular), pero cambia el evento del que depende: `Financial Tracking` se suscribe a `UserRegistered` (publicado por `Identity`), no a `FamilyCreated`.

### 3. El "predeterminado" vive en un agregado propio, separado de `PaymentMethod`

Si `isDefault` fuera un campo de cada `PaymentMethod`, garantizar "solo uno puede ser default a la vez" sería una invariante **cruzada entre agregados** (cada `PaymentMethod` es su propio Aggregate Root) — el mismo tipo de problema que ya evitamos al diseñar el orden de familias. La solución es la misma que usamos ahí: un puntero simple en un solo lugar.

Se introduce un agregado liviano nuevo, `UserPaymentMethodPreference` — una fila por usuario, con el `PaymentMethodId` que está marcado como predeterminado. Vive también en `Financial Tracking` (no hace falta tocar `Identity` para esto — evita acoplar `User` a un identificador que pertenece a otro contexto).

### 4. `paymentMethodId` es opcional como *input*, obligatorio como *dato guardado*

Mismo patrón que `Family.defaultCurrency` resolviendo `Money`: si no se especifica al crear el item, `CreateFinancialItemUseCase` lo resuelve automáticamente desde `UserPaymentMethodPreference`. El campo en `FinancialItem` nunca queda vacío.

### 5. Reportes por familia: agrupados por **nombre**, no por ID

Como decidiste, un reporte de "gastos del mes por medio de pago" a nivel de familia suma todo lo llamado "Efectivo" junto, sin importar de qué miembro venga. Esto cambia la clave del read model de `Reporting`: en vez de `paymentMethodId`, se agrupa por `paymentMethodName` (normalizado, mismo criterio case-insensitive que ya usa `PaymentMethodName.equals()`).

Para que el event handler de `Reporting` no tenga que hacer una consulta extra a `Financial Tracking` por cada evento, **el nombre viaja denormalizado dentro del propio evento** (`ItemRecorded`, `ItemPaymentMethodChanged`) — el caso de uso que dispara el evento ya tiene el `PaymentMethod` cargado en memoria para validarlo, así que incluir su nombre no cuesta nada extra.

---

## Entidades y Value Objects

### `PaymentMethod` (Aggregate Root) — actualizado

```typescript
// contexts/financial-tracking/domain/entities/payment-method.ts
class PaymentMethod {
  private constructor(
    private readonly _id: PaymentMethodId,
    private readonly _userId: UserId,   // antes era familyId
    private _name: PaymentMethodName,
    private _status: CategoryStatus,    // reutilizado, mismo criterio que en v1
  ) {}

  get id(): PaymentMethodId { return this._id; }
  get userId(): UserId { return this._userId; }
  get name(): PaymentMethodName { return this._name; }
  get status(): CategoryStatus { return this._status; }

  static create(userId: UserId, name: PaymentMethodName): PaymentMethod {
    return new PaymentMethod(PaymentMethodId.generate(), userId, name, CategoryStatus.Active);
  }

  static reconstitute(props: ReconstitutePaymentMethodProps): PaymentMethod {
    return new PaymentMethod(
      PaymentMethodId.of(props.id),
      UserId.of(props.userId),
      PaymentMethodName.of(props.name),
      props.status === "ACTIVE" ? CategoryStatus.Active : CategoryStatus.Deprecated,
    );
  }

  rename(newName: PaymentMethodName): void { this._name = newName; }
  deprecate(): void { this._status = CategoryStatus.Deprecated; }
  reactivate(): void { this._status = CategoryStatus.Active; }
}

interface ReconstitutePaymentMethodProps {
  id: string;
  userId: string;
  name: string;
  status: "ACTIVE" | "DEPRECATED";
}

export { PaymentMethod };
export type { ReconstitutePaymentMethodProps };
```

### `UserPaymentMethodPreference` (Aggregate Root nuevo)

```typescript
// contexts/financial-tracking/domain/entities/user-payment-method-preference.ts
class UserPaymentMethodPreference {
  private constructor(
    private readonly _userId: UserId,
    private _defaultPaymentMethodId: PaymentMethodId,
  ) {}

  get userId(): UserId { return this._userId; }
  get defaultPaymentMethodId(): PaymentMethodId { return this._defaultPaymentMethodId; }

  static create(userId: UserId, defaultPaymentMethodId: PaymentMethodId): UserPaymentMethodPreference {
    return new UserPaymentMethodPreference(userId, defaultPaymentMethodId);
  }

  static reconstitute(props: { userId: string; defaultPaymentMethodId: string }): UserPaymentMethodPreference {
    return new UserPaymentMethodPreference(UserId.of(props.userId), PaymentMethodId.of(props.defaultPaymentMethodId));
  }

  changeDefault(newDefaultPaymentMethodId: PaymentMethodId): void {
    this._defaultPaymentMethodId = newDefaultPaymentMethodId;
  }
}

export { UserPaymentMethodPreference };
```

Este agregado no tiene `id` propio — su identidad **es** `userId` (una fila por usuario, igual que `Member` dentro de `Family` no tiene `MemberId` propio).

### Value Objects — sin cambios respecto a v1

`PaymentMethodId`, `PaymentMethodName` — mismo diseño que ya planteamos.

---

## `FinancialItem` — ajustes

- `paymentMethodId` sigue siendo un campo obligatorio de la entidad.
- La validación de "pertenece a quién" cambia: ya no se valida contra `familyId`, se valida que `paymentMethod.userId === recordedBy`.
- `ItemRecorded` y el nuevo `ItemPaymentMethodChanged` llevan `paymentMethodId` **y** `paymentMethodName` (denormalizado, ver decisión 5).

```typescript
changePaymentMethod(newPaymentMethodId: PaymentMethodId, newPaymentMethodName: string): void {
  const previousPaymentMethodId = this._paymentMethodId;
  this._paymentMethodId = newPaymentMethodId;
  this.domainEvents.push(
    new ItemPaymentMethodChanged(
      this.id, this.familyId, previousPaymentMethodId, newPaymentMethodId, newPaymentMethodName, this.amount, this.type,
    ),
  );
}
```

---

## Casos de uso

### En `Financial Tracking`

1. **`CreateDefaultPaymentMethodsUseCase`** (interno) — crea los 4 `PaymentMethod` para un `userId`, y crea el `UserPaymentMethodPreference` inicial apuntando a "Efectivo" como default.
2. **`OnUserRegisteredHandler`** — se suscribe a `UserRegistered` (de `Identity`), invoca el caso de uso anterior. *(Reemplaza al `OnFamilyCreatedHandler` de la v1.)*
3. **`CreatePaymentMethodUseCase`** — entrada: `userId`, `name`. Rechaza nombre duplicado **dentro de los medios de pago de ese usuario** (no de toda la familia).
4. **`RenamePaymentMethodUseCase`**, **`DeprecatePaymentMethodUseCase`**, **`DeletePaymentMethodUseCase`** — mismo patrón que v1, ahora scoped por `userId`.
5. **`GetPaymentMethodsQuery`** — entrada: `userId` (no `familyId`).
6. **`SetDefaultPaymentMethodUseCase`** (nuevo) — entrada: `userId`, `paymentMethodId`. Valida que el medio de pago pertenezca al usuario y esté `Active`, busca (o crea si no existiera) el `UserPaymentMethodPreference`, invoca `changeDefault()`.

### Modificados

7. **`CreateFinancialItemUseCase`** — `paymentMethodId` pasa a **opcional** en la entrada:
   - Si viene: valida que `paymentMethod.userId === recordedBy` y que esté `Active`.
   - Si no viene: resuelve vía `UserPaymentMethodPreference` del `recordedBy`.
8. **`UpdateFinancialItemUseCase`** — `paymentMethodId` opcional; si viene, misma validación de pertenencia al usuario que registró el item (no a quien lo está editando, si son distintos — ver pendiente #3).

### En `Reporting`

9. **`GetExpensesByPaymentMethodQuery`** — sin cambios en la firma (`familyId`, `period`), pero internamente ahora agrupa por `paymentMethodName`.
10. **Event handlers** (`OnItemRecordedHandler`, `OnItemAmountChangedHandler`, `OnItemPaymentMethodChangedHandler`, `OnItemDeletedHandler`) — actualizan `PaymentMethodPeriodAggregate` usando `paymentMethodName` del evento como clave de agrupación, no `paymentMethodId`.

---

## Errores

| Error | Notas |
|---|---|
| `InvalidPaymentMethodNameError` | sin cambios |
| `DuplicatePaymentMethodNameError` | ahora valida unicidad dentro del usuario, no de la familia |
| `PaymentMethodNotFoundError` | se usa también cuando el medio de pago existe pero pertenece a **otro usuario** — mismo criterio de seguridad que ya aplicamos en `GetFamilyMembership` (no revelar si algo existe pero no es tuyo vs. no existe en absoluto) |
| `PaymentMethodNotActiveError` | sin cambios |
| `PaymentMethodHasAssociatedItemsError` | sin cambios |

Se **elimina** la necesidad de un error separado de "no pertenece a esta familia" — `PaymentMethodNotFoundError` cubre ambos casos por la razón de seguridad recién explicada.

---

## Base de datos

```typescript
// contexts/financial-tracking/infrastructure/persistence/schema.ts
export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),   // antes family_id
  name: varchar("name", { length: 40 }).notNull(),
  status: categoryStatusEnum("status").notNull().default("ACTIVE"),
});

export const userPaymentMethodPreferences = pgTable("user_payment_method_preferences", {
  userId: uuid("user_id").primaryKey(),
  defaultPaymentMethodId: uuid("default_payment_method_id").notNull().references(() => paymentMethods.id),
});

export const financialItems = pgTable("financial_items", {
  // ... columnas existentes
  paymentMethodId: uuid("payment_method_id").notNull().references(() => paymentMethods.id),
});
```

```typescript
// contexts/reporting/infrastructure/persistence/schema.ts
export const paymentMethodPeriodAggregates = pgTable("payment_method_period_aggregates", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id").notNull(),
  paymentMethodName: varchar("payment_method_name", { length: 40 }).notNull(),  // clave de agrupación, no un FK
  period: varchar("period", { length: 7 }).notNull(),
  totalExpense: numeric("total_expense", { precision: 14, scale: 2 }).notNull().default("0"),
  totalIncome: numeric("total_income", { precision: 14, scale: 2 }).notNull().default("0"),
  itemCount: integer("item_count").notNull().default(0),
});
```

Nota que `paymentMethodName` en el read model de `Reporting` **no es un FK** — es intencional, es la clave de agrupación denormalizada, no una referencia a una fila específica de `payment_methods` (que ni siquiera tendría sentido, ya que agrupa varias filas distintas bajo el mismo nombre).

`npm run db:reset` sigue siendo el camino más simple dado que no te importa perder los datos de prueba actuales.

---

## Endpoints HTTP

Cambian de estar bajo `/families/:familyId/...` a estar bajo `/me/...` (igual que `GetFamiliesForUser`/`ReorderMyFamilies`), ya que son datos del usuario, no de una familia específica:

- `POST /me/payment-methods` (`CreatePaymentMethod`)
- `GET /me/payment-methods` (`GetPaymentMethods`)
- `PATCH /me/payment-methods/:paymentMethodId` (`RenamePaymentMethod`)
- `POST /me/payment-methods/:paymentMethodId/deprecate` (`DeprecatePaymentMethod`)
- `DELETE /me/payment-methods/:paymentMethodId` (`DeletePaymentMethod`)
- `PUT /me/payment-methods/default` (`SetDefaultPaymentMethod`)
- `POST /families/:familyId/items` (`CreateFinancialItem`) — `paymentMethodId` opcional en el body.
- `PATCH /families/:familyId/items/:itemId` (`UpdateFinancialItem`) — `paymentMethodId` opcional en el body.
- `GET /families/:familyId/reports/by-payment-method` (`GetExpensesByPaymentMethod`) — sin cambios en la ruta.

---

## Plan de implementación (orden sugerido, con TDD)

1. **`PaymentMethodId`, `PaymentMethodName`** — sin cambios respecto a v1.
2. **Errores nuevos** (tabla de arriba).
3. **`PaymentMethod`** — con `userId` en vez de `familyId`, tests actualizados.
4. **`UserPaymentMethodPreference`** — entidad nueva, con tests (`create()`, `changeDefault()`, `reconstitute()`).
5. **`PaymentMethodRepository`, `UserPaymentMethodPreferenceRepository`** (puertos) + dobles in-memory.
6. **`PaymentMethodDeletionService`** — con tests.
7. **`FinancialItemRepository.countByPaymentMethod()`** — nuevo método.
8. **`FinancialItem`** — `paymentMethodId`, `changePaymentMethod()` con el evento actualizado (incluye nombre), tests.
9. **`CreateDefaultPaymentMethodsUseCase`** — con test verificando los 4 medios de pago + la preferencia default inicial.
10. **`OnUserRegisteredHandler`** — test de integración con `FakeEventBus`.
11. **`CreatePaymentMethodUseCase`, `RenamePaymentMethodUseCase`, `DeprecatePaymentMethodUseCase`, `DeletePaymentMethodUseCase`, `GetPaymentMethodsQuery`** — TDD, scoped por `userId`.
12. **`SetDefaultPaymentMethodUseCase`** — TDD, incluyendo el caso de crear la preferencia si no existía.
13. **Actualizar `CreateFinancialItemUseCase`** — `paymentMethodId` opcional + resolución del default, tests actualizados.
14. **Actualizar `UpdateFinancialItemUseCase`** — `paymentMethodId` opcional, tests actualizados.
15. **`PaymentMethodPeriodAggregate`** (Reporting) — schema + los 4 event handlers, agrupando por `paymentMethodName`, con TDD.
16. **`GetExpensesByPaymentMethodQuery`** — con TDD.
17. **Schemas de Drizzle** — tablas/columnas nuevas, `npm run db:generate`, `npm run db:reset`.
18. **Rutas HTTP** — los 8 endpoints listados arriba.
19. **Actualizar la colección de Postman**.
20. **Actualizar `casos-de-uso-financial-tracking.md` y `casos-de-uso-reporting.md`**.

## Pendientes que quedan abiertos

1. **Permisos**: mismo punto abierto de siempre, aunque acá cambia de forma — como los medios de pago son del usuario, no de la familia, probablemente no aplique ningún concepto de `Owner`/`Member` en absoluto (cada usuario gestiona los suyos sin restricción, ya que nadie más los ve). A confirmar que esa lectura es correcta.
2. **¿Se puede deprecar/eliminar el medio de pago marcado como predeterminado?** Si se elimina o deprecia, `UserPaymentMethodPreference` queda apuntando a algo inválido/inactivo — hay que decidir: ¿se reasigna automáticamente a otro (cuál?), o se bloquea la eliminación/depreciación mientras sea el default?
3. **Edición de un item por otro miembro de la familia**: si `UpdateFinancialItem` permite que cualquier miembro edite un item (no solo quien lo registró — pendiente ya abierto desde el documento original), y esa persona cambia el `paymentMethodId`, ¿debe poder elegir entre **sus propios** medios de pago, o solo entre los de quien registró el item originalmente? Con el diseño actual, la validación es contra `item.recordedBy`, no contra quien edita — a confirmar que es la semántica correcta.
4. **`GetExpensesByPaymentMethod` con nombres editados a mitad de camino**: si un usuario renombra "Efectivo" a "Cash" después de tener movimientos históricos, los períodos pasados en el read model de `Reporting` quedaron agrupados bajo el nombre viejo (por el mismo motivo que `RenameCategory` no dispara evento hoy — pendiente ya heredado del documento de `Financial Tracking`). No es exclusivo de este plan, pero se vuelve más visible acá.
