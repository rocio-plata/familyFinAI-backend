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
2. **`OnFamilyCreatedHandler`** — ✅ implementado y probado en `src/contexts/financial-tracking/application/event-handlers/on-family-created.handler.ts`, pero todavía no está suscrito en `financial-tracking.module.ts`; el flujo automático de producción sigue pendiente.
3. **`SetInitialPaymentMethodPreferenceUseCase`** (interno, nuevo) — ✅ implementado en `src/contexts/financial-tracking/application/commands/set-initial-payment-method-preference.usecase.ts`, con tests. Crea la preferencia de un miembro nuevo apuntando a `Efectivo`, es idempotente y valida que el medio pertenezca a la familia y esté activo.
4. **`OnInvitationAcceptedHandler`** (nuevo, en `Financial Tracking`) — ✅ implementado y probado en `src/contexts/financial-tracking/application/event-handlers/on-invitation-accepted.handler.ts`, pero todavía no está suscrito en el módulo/event bus.
4b. **`OnMemberRemovedHandler`** (nuevo, en `Financial Tracking`) — ✅ implementado y probado en `src/contexts/financial-tracking/application/event-handlers/on-member-removed.handler.ts`, pero todavía no está suscrito en el módulo/event bus.
5. **`CreatePaymentMethodUseCase`, `RenamePaymentMethodUseCase`, `GetPaymentMethodsQuery`** — ✅ los tres implementados con tests. `GetPaymentMethodsQuery` está en `src/contexts/financial-tracking/application/queries/get-payment-methods.query.ts`, filtra por `familyId` y excluye medios deprecados por defecto; `includeDeprecated: true` los incluye.
5b. **`DeprecatePaymentMethodUseCase`** — ✅ implementado en `src/contexts/financial-tracking/application/commands/deprecate-payment-method.usecase.ts`, con tests. Cualquier `Member` puede ejecutarlo; valida familia y rechaza si alguna preferencia apunta al medio mediante `PaymentMethodIsSomeonesDefaultError`. No publica eventos porque el agregado no define un evento de deprecación.
5c. **`DeletePaymentMethodUseCase`** — ✅ implementado en `src/contexts/financial-tracking/application/commands/delete-payment-method.usecase.ts`, con tests. Cualquier `Member` puede ejecutarlo; valida familia, defaults y items asociados antes del borrado físico. No publica eventos ni elimina preferencias.
6. **`SetDefaultPaymentMethodUseCase`** — ✅ implementado en `src/contexts/financial-tracking/application/commands/set-default-payment-method.usecase.ts`, con tests. Valida membresía, pertenencia y estado `Active`; crea o actualiza la preferencia de `(userId, familyId)`.

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
// Estado actual de financial-tracking/infrastructure/persistence/schema.ts:
// paymentMethods, userPaymentMethodPreferences y financialItems.paymentMethodId
// están declarados. paymentMethodId referencia paymentMethods.id.
```

```typescript
// contexts/reporting/infrastructure/persistence/schema.ts
export const paymentMethodPeriodAggregates = pgTable(
  "payment_method_period_aggregates",
  {
    familyId: uuid("family_id").notNull(),
    paymentMethodId: uuid("payment_method_id").notNull(),
    period: varchar("period", { length: 7 }).notNull(),
    totalExpense: numeric("total_expense", { precision: 14, scale: 2 }).notNull().default("0"),
    totalIncome: numeric("total_income", { precision: 14, scale: 2 }).notNull().default("0"),
    currency: varchar("currency", { length: 3 }).notNull(),
    itemCount: integer("item_count").notNull().default(0),
  },
  // clave natural única: (familyId, paymentMethodId, period)
);
```

`npm run db:reset` sigue siendo el camino más simple.

**Estado actual de persistencia**: los schemas y la migración `0006_icy_shriek.sql` ya declaran
las tablas de medios de pago, preferencias y el agregado de Reporting, además de las foreign keys
correspondientes. Los repositorios Drizzle de `PaymentMethod` y
`UserPaymentMethodPreference` están implementados y el composition root los selecciona cuando
`PERSISTENCE_MODE=postgres`. La migración añade
`financial_items.payment_method_id` como `NOT NULL`. La base se reiniciará con `npm run db:reset`,
por lo que no se conservarán filas anteriores ni será necesario backfill.

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
5. **`PaymentMethodRepository`, `UserPaymentMethodPreferenceRepository`** (puertos) + repositorios in-memory/Drizzle y dobles de test — ✅ implementados con tests de contrato. Incluyen `findByUserAndFamily()`, `findById()`, `existsAnyForPaymentMethod()` y `delete()`; las implementaciones hacen upsert por identidad. El composition root selecciona la implementación según `PERSISTENCE_MODE`.
6. **`PaymentMethodDeletionService`** — ✅ implementado con tests. Valida mediante `PaymentMethodItemAssociationReader` que el medio no tenga items asociados; la eliminación física queda a cargo del futuro caso de uso.
7. **`FinancialItemRepository.countByPaymentMethod()`** — ✅ implementado en el puerto y en los repositorios in-memory y Drizzle, con tests. La migración de base de datos corresponde al paso 19 y sigue pendiente.
8. **`FinancialItem`** — ✅ implementado con `paymentMethodId` obligatorio, `changePaymentMethod()`, `ItemPaymentMethodChanged` y tests. La resolución opcional mediante preferencia corresponde al paso 15.
9. **`CreateDefaultPaymentMethodsUseCase`** — ✅ implementado con test de los 4 medios de pago, el default del creador y la ejecución idempotente.
10. **`OnFamilyCreatedHandler`** — ✅ implementado con test en `tests/contexts/financial-tracking/event-handlers/on-family-created-handler.test.ts`. `FamilyCreated` fue actualizado para transportar también `creatorId` desde `Family.create()`.
11. **`SetInitialPaymentMethodPreferenceUseCase`** — ✅ implementado con tests de creación, idempotencia, aislamiento por familia y validación del estado de `Efectivo`.
12. **`OnInvitationAcceptedHandler`** (en `Financial Tracking`) — ✅ implementado con test; el cableado en el módulo/event bus sigue pendiente.
12b. **`OnMemberRemovedHandler`** (en `Financial Tracking`) — ✅ implementado con tests; el cableado en el módulo/event bus sigue pendiente.
13. **`CreatePaymentMethodUseCase`, `RenamePaymentMethodUseCase`, `GetPaymentMethodsQuery`** — ✅ implementados con tests TDD. `GetPaymentMethodsQuery` filtra medios activos por defecto y permite incluir deprecados explícitamente.
13b. **`DeprecatePaymentMethodUseCase`, `DeletePaymentMethodUseCase`** — ✅ ambos implementados con tests TDD, incluyendo los rechazos por `PaymentMethodIsSomeonesDefaultError` y `PaymentMethodHasAssociatedItemsError`.
14. **`SetDefaultPaymentMethodUseCase`** — ✅ implementado con tests TDD de creación, actualización, pertenencia y estado activo. La ruta HTTP queda pendiente.
15. **Actualizar `CreateFinancialItemUseCase`** — ✅ implementado con tests. `paymentMethodId` es opcional en el input; si no viene, se resuelve mediante `UserPaymentMethodPreferenceRepository.findByUserAndFamily(recordedBy, familyId)`. Valida familia/estado activo, lanza `NoDefaultPaymentMethodSetError` si no hay preferencia y propaga el ID resuelto al item y a `ItemRecorded`. La ruta HTTP también acepta el campo opcional.
16. **Actualizar `UpdateFinancialItemUseCase`** — ✅ implementado con tests. `paymentMethodId` es opcional; si se informa, valida familia y estado activo, cambia el medio y publica `ItemPaymentMethodChanged`. La ruta PATCH y su respuesta también lo soportan.
17. **`PaymentMethodPeriodAggregate`** (Reporting) — ✅ implementado con entidad, repositorios in-memory/Drizzle, schema y handlers para `ItemRecorded`, `ItemAmountChanged`, `ItemDeleted` e `ItemPaymentMethodChanged`, con tests unitarios. Los eventos fueron ampliados con los datos necesarios para mantener el agregado; la migración DB sigue pendiente del paso 19.
18. **`GetExpensesByPaymentMethodQuery`** — ✅ implementado con tests TDD. Devuelve gastos por medio de pago para una familia y período, incluye medios deprecados para conservar históricos, ignora ingresos/montos cero y ordena de mayor a menor. La query todavía no está construida en `reporting.module.ts` ni expuesta por HTTP.
19. **Schemas de Drizzle** — ✅ implementados, con repositorios Drizzle y migración `0006_icy_shriek.sql` aplicada mediante `npm run db:reset` para `payment_methods`, `user_payment_method_preferences`, `payment_method_period_aggregates` y la foreign key de `financial_items.payment_method_id`. No se hizo backfill.
20. **Rutas HTTP** — ✅ implementadas: endpoints CRUD/deprecación/default bajo `/families/:familyId/payment-methods` y `/families/:familyId/me/default-payment-method`, además de `/families/:familyId/reports/by-payment-method`. Pendientes las pruebas HTTP específicas y la verificación con PostgreSQL tras el reset.
21. **Actualizar la colección de Postman**.
22. **Actualizar `casos-de-uso-financial-tracking.md` y `casos-de-uso-reporting.md`**.

## Estado de los pendientes

Los dos pendientes que quedaban abiertos en la v3 ya se resolvieron:

1. ~~`RemoveMember` deja huérfana la preferencia~~ → resuelto con `OnMemberRemovedHandler` (ver arriba).
2. ~~Edición de un item por otro miembro~~ → confirmado que el comportamiento heredado (la validación es contra la familia, no contra la persona) es consistente con el resto del diseño y se mantiene tal cual.

No quedan decisiones de producto pendientes en este plan — está listo para implementar en orden.
