# Integración con PostgreSQL (Drizzle) — Guía de implementación

Documento de referencia para construir la capa de persistencia real del backend, reemplazando los repositorios in-memory usados hasta ahora en tests y como placeholder en `server.ts`. Sigue los principios ya establecidos: arquitectura hexagonal (el dominio no conoce Drizzle), mínima dependencia externa, y consistencia con el modelo DDD de cada bounded context.

---

## 1. Prerrequisitos

- Cuenta en [Neon](https://neon.tech) con un proyecto creado (free tier).
- `DATABASE_URL` del proyecto Neon, con el formato `postgresql://user:password@host/dbname?sslmode=require`.
- Dependencias ya instaladas: `drizzle-orm`, `pg`, `drizzle-kit` (dev).

Si falta alguna:
```bash
npm install drizzle-orm pg
npm install -D drizzle-kit
```

---

## 2. Estructura de carpetas

Cada contexto define su **propio schema de Drizzle** (tablas que le pertenecen) dentro de su carpeta `infrastructure/persistence/`, más un schema compartido para lo transversal (`platform/auth`). Un archivo central en `platform/db/` los reúne para las migraciones.

```
src/
├── contexts/
│   ├── family-access/
│   │   └── infrastructure/
│   │       └── persistence/
│   │           ├── schema.ts                      # tablas: families, members, invitations
│   │           ├── drizzle-family.repository.ts
│   │           └── drizzle-invitation.repository.ts
│   ├── financial-tracking/
│   │   └── infrastructure/persistence/
│   │       ├── schema.ts                          # financial_items, categories, tags
│   │       ├── drizzle-financial-item.repository.ts
│   │       └── drizzle-category.repository.ts
│   ├── budgeting/
│   │   └── infrastructure/persistence/
│   │       ├── schema.ts                          # budget_configurations, budget_period_statuses
│   │       └── drizzle-budget-configuration.repository.ts
│   ├── reporting/
│   │   └── infrastructure/persistence/
│   │       └── schema.ts                          # category_period_aggregates
│   └── ai-assistance/
│       └── infrastructure/persistence/
│           └── schema.ts                          # suggestions, merchant_category_history
│
└── platform/
    ├── auth/
    │   └── schema.ts                              # refresh_tokens
    └── db/
        ├── connection.ts                          # pool de conexión a Neon
        ├── schema.ts                              # re-exporta todos los schemas de arriba
        └── migrations/                            # generadas por drizzle-kit, no editar a mano

drizzle.config.ts                                  # en la raíz del proyecto
```

**Por qué schema por contexto y no uno solo gigante**: mantiene la misma separación vertical que ya aplicamos en `domain/` y `application/` — si `financial-tracking` es el core domain, su schema no debería mezclarse en el mismo archivo que `ai-assistance`. `platform/db/schema.ts` solo re-exporta, no define tablas nuevas.

---

## 3. Configuración de Drizzle

### `drizzle.config.ts` (raíz del proyecto)

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/platform/db/schema.ts",
  out: "./src/platform/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
```

### `platform/db/connection.ts`

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // requerido por Neon
});

const db = drizzle(pool, { schema });

export { db, pool };
```

### `platform/db/schema.ts` (re-exporta todo)

```typescript
export * from "../../contexts/family-access/infrastructure/persistence/schema.js";
export * from "../../contexts/financial-tracking/infrastructure/persistence/schema.js";
export * from "../../contexts/budgeting/infrastructure/persistence/schema.js";
export * from "../../contexts/reporting/infrastructure/persistence/schema.js";
export * from "../../contexts/ai-assistance/infrastructure/persistence/schema.js";
export * from "../auth/schema.js";
```

### Scripts en `package.json`

```json
"scripts": {
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio"
}
```

`db:studio` levanta una UI web local para inspeccionar las tablas — útil para verificar datos durante el desarrollo sin necesitar un cliente de Postgres aparte.

---

## 4. Diseño de esquema por contexto

Mapeo de cada Aggregate Root/entidad a su tabla. Los Value Objects (`Money`, `TransactionDate`, etc.) se **descomponen** en columnas simples — Drizzle/Postgres no necesitan saber que existen como VOs en el dominio, esa reconstrucción ocurre en el repositorio (sección 6).

### `family-access/infrastructure/persistence/schema.ts`

```typescript
import { pgTable, uuid, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role_type", ["OWNER", "MEMBER"]);
export const invitationStatusEnum = pgEnum("invitation_status", ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"]);

export const families = pgTable("families", {
  id: uuid("id").primaryKey(),
  name: varchar("name", { length: 60 }).notNull(),
  defaultCurrency: varchar("default_currency", { length: 3 }).notNull().default("CLP"),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const members = pgTable("members", {
  familyId: uuid("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  role: roleEnum("role").notNull(),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (table) => ({
  // clave primaria compuesta: un usuario solo puede tener una membresía por familia
  pk: { columns: [table.familyId, table.userId], name: "members_pk" },
}));

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  invitedEmail: varchar("invited_email", { length: 255 }).notNull(),
  role: roleEnum("role").notNull(),
  status: invitationStatusEnum("status").notNull().default("PENDING"),
  expiresAt: timestamp("expires_at").notNull(),
  invitedUserId: uuid("invited_user_id"),
});
```

**Nota sobre `members`**: no tiene columna `id` propia — su identidad es la combinación `(familyId, userId)`, igual que en el dominio (`Member` no tiene `MemberId`, su identidad es el `UserId` dentro del agregado `Family`).

### `financial-tracking/infrastructure/persistence/schema.ts`

```typescript
import { pgTable, uuid, varchar, text, numeric, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";

export const itemTypeEnum = pgEnum("financial_item_type", ["EXPENSE", "INCOME"]);
export const categoryStatusEnum = pgEnum("category_status", ["ACTIVE", "DEPRECATED"]);

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id").notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  status: categoryStatusEnum("status").notNull().default("ACTIVE"),
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey(),
  categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 30 }).notNull(),
  displayOrder: integer("display_order").notNull(),
  status: categoryStatusEnum("status").notNull().default("ACTIVE"),
});

export const financialItems = pgTable("financial_items", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id").notNull(),
  recordedBy: uuid("recorded_by").notNull(),
  type: itemTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  categoryId: uuid("category_id").notNull().references(() => categories.id),
  tagId: uuid("tag_id").references(() => tags.id),
  title: varchar("title", { length: 100 }).notNull(),
  note: text("note"),
  occurredOn: timestamp("occurred_on").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

**Nota sobre `Money`**: se descompone en `amount` (`numeric`, nunca `float`/`double` — precisión exacta requerida para dinero) + `currency` por separado. `numeric(14, 2)` da margen amplio para montos en CLP sin decimales relevantes, pero deja espacio si en el futuro se soportan monedas con decimales.

### `budgeting/infrastructure/persistence/schema.ts`

```typescript
import { pgTable, uuid, numeric, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export const budgetConfigurations = pgTable("budget_configurations", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id").notNull(),
  categoryId: uuid("category_id").notNull(),
  defaultAmount: numeric("default_amount", { precision: 14, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true),
  overrides: jsonb("overrides").notNull().default({}), // { "2026-09": "150000.00", ... }
});

export const budgetPeriodStatuses = pgTable("budget_period_statuses", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id").notNull(),
  categoryId: uuid("category_id").notNull(),
  period: uuid("period").notNull(), // ver nota abajo — probablemente varchar, no uuid
  limitAmount: numeric("limit_amount", { precision: 14, scale: 2 }).notNull(),
  spent: numeric("spent", { precision: 14, scale: 2 }).notNull().default("0"),
});
```

**Nota sobre `overrides`**: se guarda como `jsonb` — es un mapa pequeño (excepciones puntuales, no todos los meses), así que no amerita una tabla relacional separada; Postgres permite indexar/consultar dentro de `jsonb` si más adelante hiciera falta.

**Nota sobre `period`**: quedó mal tipado arriba a propósito, para señalar un pendiente real — `BudgetPeriod` (año+mes) debería mapearse como `varchar(7)` (ej. `"2026-09"`) o como dos columnas `year`/`month` (`integer`), no como `uuid`. Se corrige en la sección de pendientes.

### `reporting/infrastructure/persistence/schema.ts`

```typescript
import { pgTable, uuid, varchar, numeric, integer } from "drizzle-orm/pg-core";

export const categoryPeriodAggregates = pgTable("category_period_aggregates", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id").notNull(),
  categoryId: uuid("category_id").notNull(),
  period: varchar("period", { length: 7 }).notNull(), // "2026-09"
  totalExpense: numeric("total_expense", { precision: 14, scale: 2 }).notNull().default("0"),
  totalIncome: numeric("total_income", { precision: 14, scale: 2 }).notNull().default("0"),
  itemCount: integer("item_count").notNull().default(0),
});
```

### `ai-assistance/infrastructure/persistence/schema.ts`

```typescript
import { pgTable, uuid, varchar, numeric, text, timestamp, real, pgEnum } from "drizzle-orm/pg-core";

export const suggestionStatusEnum = pgEnum("suggestion_status", ["PENDING", "CONFIRMED", "DISCARDED"]);
export const suggestionSourceEnum = pgEnum("suggestion_source", ["TEXT", "RECEIPT"]);

export const suggestions = pgTable("suggestions", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id").notNull(),
  source: suggestionSourceEnum("source").notNull(),
  rawInput: text("raw_input"), // texto original, o null si vino de un recibo
  merchantName: varchar("merchant_name", { length: 100 }), // solo para recibos
  suggestedAmount: numeric("suggested_amount", { precision: 14, scale: 2 }).notNull(),
  suggestedCategoryId: uuid("suggested_category_id"),
  suggestedTagId: uuid("suggested_tag_id"),
  suggestedDate: timestamp("suggested_date").notNull(),
  confidence: real("confidence").notNull(),
  status: suggestionStatusEnum("status").notNull().default("PENDING"),
});

export const merchantCategoryHistory = pgTable("merchant_category_history", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id").notNull(),
  merchantName: varchar("merchant_name", { length: 100 }).notNull(),
  categoryId: uuid("category_id").notNull(),
  tagId: uuid("tag_id"),
  timesUsed: integer("times_used").notNull().default(1),
});
```

**Nota**: `ExpenseSuggestion` y `ReceiptSuggestion` se unificaron en una sola tabla `suggestions` con un discriminador `source` — evita duplicar columnas casi idénticas en dos tablas. El repositorio reconstruye la entidad correcta (`ExpenseSuggestion` vs `ReceiptSuggestion`) según ese campo.

### `platform/auth/schema.ts`

```typescript
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const refreshTokens = pgTable("refresh_tokens", {
  value: varchar("value", { length: 64 }).primaryKey(),
  userId: uuid("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
});
```

---

## 5. Migraciones — flujo de trabajo

1. Modificar/crear un `schema.ts`.
2. Generar la migración: `npm run db:generate` — Drizzle Kit compara el schema con el estado actual y genera un archivo SQL en `platform/db/migrations/`.
3. Revisar el SQL generado antes de aplicarlo (Drizzle a veces necesita confirmación manual en cambios ambiguos, como renombrar una columna vs. borrar+crear).
4. Aplicar: `npm run db:migrate`.
5. Commitear tanto el cambio en `schema.ts` como el archivo de migración generado — las migraciones son parte del código versionado, nunca se editan a mano después de generadas.

---

## 6. Patrón de implementación de repositorios

Cada repositorio traduce entre filas de Postgres y entidades de dominio en dos direcciones: `toDomain()` (lectura) y `toPersistence()` (escritura). El dominio nunca ve una fila de Drizzle directamente.

```typescript
// contexts/family-access/infrastructure/persistence/drizzle-family.repository.ts
import { eq } from "drizzle-orm";
import { db } from "../../../../platform/db/connection.js";
import { families, members } from "./schema.js";
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import { Family } from "../../domain/entities/family.js";
import { FamilyId } from "../../domain/value-objects/family-id.js";
import { FamilyName } from "../../domain/value-objects/family-name.js";
import { UserId } from "../../domain/value-objects/user-id.js";
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Role } from "../../domain/value-objects/role.js";

class DrizzleFamilyRepository implements FamilyRepository {
  async save(family: Family): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .insert(families)
        .values(this.toPersistence(family))
        .onConflictDoUpdate({
          target: families.id,
          set: { name: family.name.toString(), defaultCurrency: family.defaultCurrency.toString() },
        });

      // estrategia simple: borrar e insertar de nuevo todos los miembros
      // (aceptable dado que una familia tiene pocos miembros; no es un patrón para tablas grandes)
      await tx.delete(members).where(eq(members.familyId, family.id.toString()));
      if (family.members.length > 0) {
        await tx.insert(members).values(
          family.members.map((m) => ({
            familyId: family.id.toString(),
            userId: m.userId.toString(),
            role: m.role.isOwner() ? ("OWNER" as const) : ("MEMBER" as const),
            joinedAt: m.joinedAt,
          })),
        );
      }
    });
  }

  async findById(id: FamilyId): Promise<Family | null> {
    const familyRow = await db.query.families.findFirst({ where: eq(families.id, id.toString()) });
    if (!familyRow) return null;

    const memberRows = await db.query.members.findMany({ where: eq(members.familyId, id.toString()) });

    return this.toDomain(familyRow, memberRows);
  }

  private toPersistence(family: Family) {
    return {
      id: family.id.toString(),
      name: family.name.toString(),
      defaultCurrency: family.defaultCurrency.toString(),
      createdBy: family.createdBy.toString(),
      createdAt: family.createdAt,
    };
  }

  private toDomain(familyRow: typeof families.$inferSelect, memberRows: (typeof members.$inferSelect)[]): Family {
    // Family no expone un constructor público "desde persistencia" todavía — ver pendientes.
    // Requiere un factory adicional tipo Family.reconstitute(...) que no valide invariantes de creación
    // (ya fueron validadas cuando se creó originalmente), solo reconstruya el estado.
    throw new Error("Pendiente: Family.reconstitute() no está implementado todavía");
  }
}

export { DrizzleFamilyRepository };
```

**El punto más importante de esta sección**: `toDomain()` necesita una forma de reconstruir un `Family` (y en general, cualquier Aggregate Root) **sin volver a ejecutar las validaciones de creación** ni disparar eventos de dominio otra vez — leer de la base de datos no es "crear una familia nueva". Hoy ninguna de las entidades tiene ese método. Es el pendiente más importante de toda esta guía (ver sección 8).

---

## 7. Transacciones multi-agregado (Unit of Work)

Ya identificamos este problema en `AcceptInvitationUseCase`: se guardan dos agregados (`Invitation` y `Family`) que deben ser consistentes entre sí. Con Drizzle, la solución es envolver ambos `save()` en una sola transacción de Postgres — pero eso requiere que los repositorios acepten un cliente de transacción en vez de usar siempre el `db` global.

```typescript
// platform/db/unit-of-work.ts
import { db } from "./connection.js";

type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface UnitOfWork {
  run<T>(work: (tx: TransactionClient) => Promise<T>): Promise<T>;
}

class DrizzleUnitOfWork implements UnitOfWork {
  async run<T>(work: (tx: TransactionClient) => Promise<T>): Promise<T> {
    return db.transaction(work);
  }
}

export { DrizzleUnitOfWork };
export type { UnitOfWork, TransactionClient };
```

Esto implica un cambio de firma en los repositorios (aceptar opcionalmente un `tx`), y en el caso de uso:

```typescript
// contexts/family-access/application/commands/accept-invitation.usecase.ts (ajuste conceptual)
async execute(command: AcceptInvitationCommand): Promise<void> {
  await this.unitOfWork.run(async (tx) => {
    const invitation = await this.invitationRepository.findById(command.invitationId, tx);
    // ...
    invitation.accept(command.acceptingUserId);
    await this.invitationRepository.save(invitation, tx);

    const family = await this.familyRepository.findById(invitation.familyId, tx);
    family.addMemberFromInvitationData(command.acceptingUserId, invitation.role);
    await this.familyRepository.save(family, tx);
  });

  // eventos se publican DESPUÉS de que la transacción confirma (mismo principio que ya establecimos)
}
```

Esto es un cambio de interfaz no trivial (`FamilyRepository`/`InvitationRepository` necesitan aceptar un `tx` opcional), así que conviene implementarlo cuando conectemos este caso de uso específico, no antes.

---

## 8. Pendientes antes/durante la implementación

1. **`Entity.reconstitute()` en cada Aggregate Root**: ninguna entidad (`Family`, `FinancialItem`, `Category`, etc.) tiene hoy un factory para reconstruirse desde persistencia sin re-disparar validaciones de creación ni eventos de dominio. Es el bloqueante más importante — probablemente un patrón como `Family.reconstitute(props)` (sin eventos, sin invariantes de "creación", solo invariantes de forma) en cada entidad, antes de escribir cualquier `toDomain()` real.
2. **Corregir el tipo de `period` en `budget_period_statuses`**: quedó como `uuid` por error en el borrador de esta guía — debe ser `varchar(7)` como en `category_period_aggregates`.
3. **Unit of Work**: diseñado conceptualmente en la sección 7, pero no implementado — impacta la firma de todos los repositorios (agregar parámetro `tx` opcional).
4. **Testing de integración contra Postgres real**: hoy todos los tests usan repositorios in-memory. Falta decidir la estrategia para tests que sí toquen Postgres (¿una base de datos de test separada en Neon? ¿contenedor Docker local? — esto último requeriría Docker como nueva dependencia de desarrollo, a evaluar contra el criterio de pocas dependencias).
5. **Índices**: ninguna tabla tiene índices definidos más allá de las primary keys — como mínimo, `familyId` en casi todas las tablas necesita índice (es el filtro más común de todas las queries), y `financial_items` se beneficiaría de un índice compuesto `(family_id, occurred_on)` para las consultas de `GetFinancialItems`/`GetDashboardSummary`.
6. **Pool de conexiones en serverless**: si el backend se despliega en un entorno serverless (funciones que se crean/destruyen por request), un `Pool` de `pg` tradicional puede agotar las conexiones de Neon rápidamente — Neon ofrece un driver HTTP/WebSocket (`@neondatabase/serverless`) pensado para este escenario, a evaluar según cómo termine desplegándose el backend.
