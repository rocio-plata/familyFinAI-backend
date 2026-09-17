# Plan de implementación — Medios de Pago (v3: compartidos por familia, default por usuario)

## Resumen

`PaymentMethod` **pertenece a la familia** — compartido entre todos sus miembros, sin duplicados (una sola "Efectivo" por familia, no una por cada usuario). Lo que sí es individual es **cuál está marcado como predeterminado**: cada usuario puede tener un default distinto dentro de la misma familia (y, como un usuario puede pertenecer a varias familias, un default distinto **por familia** también).


---

## Decisiones de diseño

### 1. `PaymentMethod` scoped por `familyId` (como en la v1 original)

Vuelve a ser igual que `Category`/`Tag`: una lista compartida por toda la familia. Se crean los 4 por defecto al crear la familia (`FamilyCreated`), mismo patrón event-driven que ya usamos.

### 2. El "default" es una preferencia **por usuario, dentro de una familia** — no global

Como el mismo usuario puede pertenecer a varias familias (multi-familia), "mi medio de pago por defecto" no puede ser un valor único y global — necesita estar scoped por **(usuario, familia)**. Ejemplo: en su familia compartida usa "Efectivo" por defecto; en su familia personal, "Tarjeta de Débito".

### 3. El "default" vive en un agregado propio, separado de `PaymentMethod`

Mismo motivo que en versiones anteriores: si `isDefault` fuera un campo de `PaymentMethod`, sería una invariante cruzada entre agregados (¿cuál está marcado, entre varios `PaymentMethod` independientes?). Se resuelve con un puntero simple: `UserPaymentMethodPreference`, identificado por la combinación `(userId, familyId)`.

### 4. Toda membresía nueva recibe un default automáticamente — nunca queda "sin default"

Para que `CreateFinancialItemUseCase` nunca tenga que **adivinar** cuál sería un buen default si no existe ninguna preferencia, se garantiza que siempre exista una:

- **Al crear la familia** (`FamilyCreated`): se crean los 4 medios de pago, y se fija el default del creador (`Owner`) en "Efectivo".
- **Al aceptar una invitación** (`InvitationAccepted`): se fija el default del nuevo miembro en "Efectivo" también, para esa familia.

Así, `CreateFinancialItemUseCase` simplemente **lee** la preferencia existente — si no la encuentra, es un caso realmente excepcional (bug de datos), no un flujo normal a contemplar con lógica de fallback.

### 5. Reportes por familia: se simplifican de vuelta — sin necesidad de agrupar por nombre

Como ya no hay medios de pago duplicados por usuario, el problema que motivó "agrupar por nombre" en la v2 desaparece. `PaymentMethodPeriodAggregate` vuelve a agruparse por `paymentMethodId` directamente — más simple, sin denormalizar nombres en los eventos.

---

## Entidades y Value Objects

### `PaymentMethod` (Aggregate Root) — igual que la v1 original

```typescript
// contexts/financial-tracking/domain/entities/payment-method.ts
class PaymentMethod {
  private constructor(
    private readonly _id: PaymentMethodId,
    private readonly _familyId: FamilyId,
    private _name: PaymentMethodName,
    private _status: CategoryStatus,
  ) {}

  get id(): PaymentMethodId { return this._id; }
  get familyId(): FamilyId { return this._familyId; }
  get name(): PaymentMethodName { return this._name; }
  get status(): CategoryStatus { return this._status; }

  static create(familyId: FamilyId, name: PaymentMethodName): PaymentMethod {
    return new PaymentMethod(PaymentMethodId.generate(), familyId, name, CategoryStatus.Active);
  }

  static reconstitute(props: ReconstitutePaymentMethodProps): PaymentMethod {
    return new PaymentMethod(
      PaymentMethodId.of(props.id),
      FamilyId.of(props.familyId),
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
  familyId: string;
  name: string;
  status: "ACTIVE" | "DEPRECATED";
}

export { PaymentMethod };
export type { ReconstitutePaymentMethodProps };
```

### `UserPaymentMethodPreference` (Aggregate Root) — clave compuesta

```typescript
// contexts/financial-tracking/domain/entities/user-payment-method-preference.ts
class UserPaymentMethodPreference {
  private constructor(
    private readonly _userId: UserId,
    private readonly _familyId: FamilyId,
    private _defaultPaymentMethodId: PaymentMethodId,
  ) {}

  get userId(): UserId { return this._userId; }
  get familyId(): FamilyId { return this._familyId; }
  get defaultPaymentMethodId(): PaymentMethodId { return this._defaultPaymentMethodId; }

  static create(userId: UserId, familyId: FamilyId, defaultPaymentMethodId: PaymentMethodId): UserPaymentMethodPreference {
    return new UserPaymentMethodPreference(userId, familyId, defaultPaymentMethodId);
  }

  static reconstitute(props: {
    userId: string; familyId: string; defaultPaymentMethodId: string;
  }): UserPaymentMethodPreference {
    return new UserPaymentMethodPreference(
      UserId.of(props.userId), FamilyId.of(props.familyId), PaymentMethodId.of(props.defaultPaymentMethodId),
    );
  }

  changeDefault(newDefaultPaymentMethodId: PaymentMethodId): void {
    this._defaultPaymentMethodId = newDefaultPaymentMethodId;
  }
}

export { UserPaymentMethodPreference };
```

Identidad = `(userId, familyId)`, sin `id` propio — igual que `Member` dentro de `Family`.

### Value Objects — sin cambios

`PaymentMethodId`, `PaymentMethodName` — igual que en versiones anteriores.

---

## `FinancialItem` — ajustes

- `paymentMethodId` sigue siendo obligatorio en la entidad, opcional como input (resuelto vía `UserPaymentMethodPreference` si no se especifica).
- La validación de pertenencia vuelve a ser contra `familyId` (como en la v1): `paymentMethod.familyId === item.familyId`.
- `ItemRecorded`/`ItemPaymentMethodChanged` llevan `paymentMethodId` — **sin** necesidad de denormalizar el nombre (a diferencia de la v2).

```typescript
changePaymentMethod(newPaymentMethodId: PaymentMethodId): void {
  const previousPaymentMethodId = this._paymentMethodId;
  this._paymentMethodId = newPaymentMethodId;
  this.domainEvents.push(
    new ItemPaymentMethodChanged(this.id, this.familyId, previousPaymentMethodId, newPaymentMethodId, this.amount, this.type),
  );
}
```

---

## Casos de uso

### En `Financial Tracking`

1. **`CreateDefaultPaymentMethodsUseCase`** (interno) — ✅ implementado en `src/contexts/financial-tracking/application/commands/create-default-payment-methods.usecase.ts`, con tests TDD. Crea los 4 `PaymentMethod` de la familia y el `UserPaymentMethodPreference` del creador apuntando a "Efectivo"; el flujo es idempotente.
2. **`OnFamilyCreatedHandler`** — ✅ implementado en `src/contexts/financial-tracking/application/event-handlers/on-family-created.handler.ts`. Recibe `FamilyCreated`, que transporta `familyId` y `creatorId`, e invoca `CreateDefaultPaymentMethodsUseCase` con ambos valores.
3. **`SetInitialPaymentMethodPreferenceUseCase`** (interno, nuevo) — ✅ implementado en `src/contexts/financial-tracking/application/commands/set-initial-payment-method-preference.usecase.ts`, con tests. Crea la preferencia de un miembro nuevo apuntando a `Efectivo`, es idempotente y valida que el medio pertenezca a la familia y esté activo.
4. **`OnInvitationAcceptedHandler`** (nuevo, en `Financial Tracking`) — ✅ implementado en `src/contexts/financial-tracking/application/event-handlers/on-invitation-accepted.handler.ts`, con test. Recibe `InvitationAccepted`, usa `acceptedBy` y `familyId` para invocar el caso de uso anterior. Su registro en el módulo/event bus queda pendiente de ampliar las dependencias de medios de pago.
4b. **`OnMemberRemovedHandler`** (nuevo, en `Financial Tracking`) — ✅ implementado en `src/contexts/financial-tracking/application/event-handlers/on-member-removed.handler.ts`, con tests. Consume `MemberRemoved` y elimina la preferencia de `(removedUserId, familyId)` de forma idempotente. Su registro en el módulo/event bus queda pendiente de ampliar las dependencias de medios de pago.
5. **`CreatePaymentMethodUseCase`, `RenamePaymentMethodUseCase`, `GetPaymentMethodsQuery`** — `CreatePaymentMethodUseCase` ✅ implementado en `src/contexts/financial-tracking/application/commands/create-payment-method.usecase.ts` y `RenamePaymentMethodUseCase` ✅ implementado en `src/contexts/financial-tracking/application/commands/rename-payment-method.usecase.ts`, ambos con tests. Están scoped por `familyId`, permiten cualquier `Member` y aplican unicidad case-insensitive dentro de la familia. `GetPaymentMethodsQuery` sigue pendiente.
5b. **`DeprecatePaymentMethodUseCase`** — antes de invocar `deprecate()`, valida que ningún `UserPaymentMethodPreference` apunte a este medio de pago (`UserPaymentMethodPreferenceRepository.existsAnyForPaymentMethod()`, nuevo método del puerto); si alguno lo tiene como default, rechaza con `PaymentMethodIsSomeonesDefaultError`. Sin restricción de rol.
5c. **`DeletePaymentMethodUseCase`** — usa `PaymentMethodDeletionService` (protección por items asociados, igual que `Category`) **y además** la misma validación de 5b antes de eliminar. Sin restricción de rol.
6. **`SetDefaultPaymentMethodUseCase`** — entrada: `userId`, `familyId`, `paymentMethodId`. Valida que el medio de pago pertenezca a esa familia y esté `Active`; busca o crea el `UserPaymentMethodPreference` de `(userId, familyId)`.

### Modificados

7. **`CreateFinancialItemUseCase`** — `paymentMethodId` opcional; si no viene, se resuelve vía `UserPaymentMethodPreferenceRepository.findByUserAndFamily(recordedBy, familyId)`.
8. **`UpdateFinancialItemUseCase`** — `paymentMethodId` opcional; si viene, valida pertenencia a la familia del item (no al usuario que edita).

### En `Reporting` — vuelve a la simplicidad de la v1

9. **`GetExpensesByPaymentMethodQuery`** — agrupa por `paymentMethodId` directamente.
10. **Event handlers** — actualizan `PaymentMethodPeriodAggregate` (`familyId`, `paymentMethodId`, `period`) sin necesidad de nombres denormalizados.

---

## Errores

| Error | Notas |
|---|---|
| `InvalidPaymentMethodNameError` | sin cambios |
| `DuplicatePaymentMethodNameError` | unicidad dentro de la familia (como en v1) |
| `PaymentMethodNotFoundError` | cubre también "existe pero es de otra familia" (mismo criterio de seguridad ya aplicado en otros lugares) |
| `PaymentMethodNotActiveError` | sin cambios |
| `PaymentMethodHasAssociatedItemsError` | sin cambios |
| `PaymentMethodIsSomeonesDefaultError` (nuevo) | se lanza en `DeprecatePaymentMethod`/`DeletePaymentMethod` si algún `UserPaymentMethodPreference` de la familia lo tiene marcado como default |
| `NoDefaultPaymentMethodSetError` (nuevo) | caso excepcional: `CreateFinancialItemUseCase` no encuentra ninguna preferencia — no debería ocurrir en flujo normal (ver decisión 4), pero se maneja explícito en vez de fallar con un error genérico |

---

## Base de datos

```typescript
// contexts/financial-tracking/infrastructure/persistence/schema.ts
export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id").notNull(),
  name: varchar("name", { length: 40 }).notNull(),
  status: categoryStatusEnum("status").notNull().default("ACTIVE"),
});

export const userPaymentMethodPreferences = pgTable(
  "user_payment_method_preferences",
  {
    userId: uuid("user_id").notNull(),
    familyId: uuid("family_id").notNull(),
    defaultPaymentMethodId: uuid("default_payment_method_id").notNull().references(() => paymentMethods.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.familyId] }),
  }),
);

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
  paymentMethodId: uuid("payment_method_id").notNull(),
  period: varchar("period", { length: 7 }).notNull(),
  totalExpense: numeric("total_expense", { precision: 14, scale: 2 }).notNull().default("0"),
  totalIncome: numeric("total_income", { precision: 14, scale: 2 }).notNull().default("0"),
  itemCount: integer("item_count").notNull().default(0),
});
```

`npm run db:reset` sigue siendo el camino más simple.

---

## Endpoints HTTP

Vuelven a vivir bajo `/families/:familyId/...` (como `Category`), salvo el de "mi default", que es explícitamente personal dentro de esa familia:

- `POST /families/:familyId/payment-methods` (`CreatePaymentMethod`)
- `GET /families/:familyId/payment-methods` (`GetPaymentMethods`)
- `PATCH /families/:familyId/payment-methods/:paymentMethodId` (`RenamePaymentMethod`)
- `POST /families/:familyId/payment-methods/:paymentMethodId/deprecate` (`DeprecatePaymentMethod`)
- `DELETE /families/:familyId/payment-methods/:paymentMethodId` (`DeletePaymentMethod`)
- `PUT /families/:familyId/me/default-payment-method` (`SetDefaultPaymentMethod`) — nota el `/me/` intermedio: es una preferencia del usuario autenticado, dentro del scope de esa familia.
- `POST /families/:familyId/items` (`CreateFinancialItem`) — `paymentMethodId` opcional en el body.
- `PATCH /families/:familyId/items/:itemId` (`UpdateFinancialItem`) — `paymentMethodId` opcional en el body.
- `GET /families/:familyId/reports/by-payment-method` (`GetExpensesByPaymentMethod`).

---

## Plan de implementación (orden sugerido, con TDD)

1. **`PaymentMethodId`, `PaymentMethodName`** — ✅ implementados con validación y tests.
2. **Errores** — ✅ implementados con tests: `InvalidPaymentMethodIdError`, `InvalidPaymentMethodNameError`, `DuplicatePaymentMethodNameError`, `PaymentMethodNotFoundError`, `PaymentMethodNotActiveError`, `PaymentMethodHasAssociatedItemsError`, `PaymentMethodIsSomeonesDefaultError` y `NoDefaultPaymentMethodSetError`.
3. **`PaymentMethod`** — ✅ implementado, scoped por `familyId`, con tests.
4. **`UserPaymentMethodPreference`** — ✅ implementado con clave compuesta `(userId, familyId)` y tests.
5. **`PaymentMethodRepository`, `UserPaymentMethodPreferenceRepository`** (puertos) + repositorios in-memory y dobles de test — ✅ implementados con tests de contrato. Incluyen `findByUserAndFamily()`, `findById()`, `existsAnyForPaymentMethod()` y `delete()`; ambas implementaciones in-memory mantienen upsert por identidad. Los adaptadores Drizzle corresponden al paso 19 y siguen pendientes.
6. **`PaymentMethodDeletionService`** — ✅ implementado con tests. Valida mediante `PaymentMethodItemAssociationReader` que el medio no tenga items asociados; la eliminación física queda a cargo del futuro caso de uso.
7. **`FinancialItemRepository.countByPaymentMethod()`** — ✅ implementado en el puerto y en los repositorios in-memory y Drizzle, con tests. La migración de base de datos corresponde al paso 19 y sigue pendiente.
8. **`FinancialItem`** — ✅ implementado con `paymentMethodId` obligatorio, `changePaymentMethod()`, `ItemPaymentMethodChanged` y tests. La resolución opcional mediante preferencia corresponde al paso 15.
9. **`CreateDefaultPaymentMethodsUseCase`** — ✅ implementado con test de los 4 medios de pago, el default del creador y la ejecución idempotente.
10. **`OnFamilyCreatedHandler`** — ✅ implementado con test en `tests/contexts/financial-tracking/event-handlers/on-family-created-handler.test.ts`. `FamilyCreated` fue actualizado para transportar también `creatorId` desde `Family.create()`.
11. **`SetInitialPaymentMethodPreferenceUseCase`** — ✅ implementado con tests de creación, idempotencia, aislamiento por familia y validación del estado de `Efectivo`.
12. **`OnInvitationAcceptedHandler`** (en `Financial Tracking`) — ✅ implementado con test verificando que un nuevo miembro recibe su preferencia automáticamente al aceptar. El cableado en el módulo queda pendiente.
12b. **`OnMemberRemovedHandler`** (en `Financial Tracking`) — ✅ implementado con tests verificando la eliminación de la preferencia y el comportamiento tolerante cuando no existe. El cableado en el módulo queda pendiente.
13. **`CreatePaymentMethodUseCase`, `RenamePaymentMethodUseCase`, `GetPaymentMethodsQuery`** — `CreatePaymentMethodUseCase` y `RenamePaymentMethodUseCase` ✅ implementados con tests TDD. `GetPaymentMethodsQuery` sigue pendiente.
13b. **`DeprecatePaymentMethodUseCase`, `DeletePaymentMethodUseCase`** — TDD, incluyendo el caso rechazado por `PaymentMethodIsSomeonesDefaultError`.
14. **`SetDefaultPaymentMethodUseCase`** — TDD.
15. **Actualizar `CreateFinancialItemUseCase`** — `paymentMethodId` opcional + resolución de default + `NoDefaultPaymentMethodSetError` para el caso excepcional.
16. **Actualizar `UpdateFinancialItemUseCase`** — `paymentMethodId` opcional.
17. **`PaymentMethodPeriodAggregate`** (Reporting) — schema + los 4 event handlers, con TDD.
18. **`GetExpensesByPaymentMethodQuery`** — con TDD.
19. **Schemas de Drizzle** — tablas/columnas, `npm run db:generate`, `npm run db:reset`.
20. **Rutas HTTP** — los 9 endpoints.
21. **Actualizar la colección de Postman**.
22. **Actualizar `casos-de-uso-financial-tracking.md` y `casos-de-uso-reporting.md`**.

## Estado de los pendientes

Los dos pendientes que quedaban abiertos en la v3 ya se resolvieron:

1. ~~`RemoveMember` deja huérfana la preferencia~~ → resuelto con `OnMemberRemovedHandler` (ver arriba).
2. ~~Edición de un item por otro miembro~~ → confirmado que el comportamiento heredado (la validación es contra la familia, no contra la persona) es consistente con el resto del diseño y se mantiene tal cual.

No quedan decisiones de producto pendientes en este plan — está listo para implementar en orden.
