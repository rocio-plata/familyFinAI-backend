# AGENTS.md — FamilyFin AI Backend

Directrices para agentes de IA que trabajen en este repositorio. Leer antes de generar o modificar cualquier archivo.

---

## Descripción del proyecto

**FamilyFin AI** es un backend de gestión colaborativa de finanzas familiares. Expone una API REST consumida por una app móvil Kotlin. Los usuarios de una misma familia registran gastos e ingresos, consultan su economía compartida y reciben asistencia de IA bajo la filosofía **"la IA propone, el usuario confirma"**.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Runtime | Node.js LTS (20.x / 22.x) + npm |
| Framework HTTP | Fastify v5 |
| ORM | Drizzle ORM |
| Base de datos | PostgreSQL (Neon) |
| Autenticación | JWT propio con `jose` (sin SDK de terceros) |
| Testing | `node:test` nativo (sin Jest, sin Vitest) |
| Lint / formato | Biome |
| Lenguaje | TypeScript (ESM, `"type": "module"`) |

**Criterio guía**: minimizar dependencias externas. No agregar librerías que no estén ya en `package.json` sin justificación explícita.

---

## Arquitectura

El proyecto sigue **Domain-Driven Design (DDD)** con **arquitectura hexagonal** (puertos y adaptadores).

### Bounded Contexts

| Contexto | Ruta | Rol |
|---|---|---|
| Family & Access | `src/contexts/family-access/` | Upstream — ancla al resto |
| Financial Tracking | `src/contexts/financial-tracking/` | Core domain |
| Budgeting | `src/contexts/budgeting/` | Soporte |
| Reporting & Analytics | `src/contexts/reporting/` | Consumidor (read models) |
| AI Assistance | `src/contexts/ai-assistance/` | Genérico — nunca escribe directo en el dominio financiero |

### Estructura interna de cada contexto

```
<contexto>/
├── domain/
│   ├── entities/         # Aggregate roots y entidades hijas
│   ├── value-objects/    # VOs inmutables con validación en constructor
│   ├── events/           # Eventos de dominio publicados por este contexto
│   ├── errors/           # Errores de dominio (extienden DomainError)
│   ├── repositories/     # Interfaces/puertos de persistencia
│   └── ports/            # Puertos hacia servicios externos (solo ai-assistance)
├── application/
│   ├── commands/         # Casos de uso de escritura (UseCase)
│   ├── queries/          # Casos de uso de lectura (Query)
│   └── event-handlers/   # Reacciones a eventos de otros contextos
└── infrastructure/
    ├── persistence/      # Implementaciones Drizzle de los repositorios
    ├── http/             # Rutas Fastify
    └── providers/        # Adaptadores externos (solo ai-assistance)
```

### Shared Kernel

`src/shared-kernel/` contiene únicamente lo que **todos** los contextos necesitan: `DomainEvent`, `Currency`, `Uuid`, utilidades de fecha. No agregar nada aquí sin causa fuerte.

### Platform

`src/platform/` es infraestructura transversal: servidor Fastify, conexión DB, event bus, autenticación. No pertenece a ningún contexto de negocio.

---

## Comunicación entre contextos

- **Síncrona** (llamada directa al caso de uso público de otro contexto): cuando el origen necesita el resultado para continuar. Ejemplo: `AI Assistance` confirmar sugerencia → llama a `CreateFinancialItemUseCase` de `Financial Tracking`.
- **Asíncrona** (eventos de dominio vía `InProcessEventBus`): cuando el destino solo reacciona. Ejemplo: `ItemRecorded` es escuchado por `Budgeting` y `Reporting`.

**Regla**: `Financial Tracking` (core domain) **nunca** se suscribe a eventos de otros contextos — solo los publica.

---

## Convenciones de código

### Formato (Biome)
- Indentación: **2 espacios**.
- Ancho máximo de línea: **100 caracteres**.
- Comillas: **dobles** (`"`) en JavaScript/TypeScript.
- Punto y coma: **siempre**.
- `noNonNullAssertion`: advertencia (evitar `!` salvo causa justificada).

### TypeScript
- ESM puro: todas las importaciones internas llevan extensión `.js` (aunque el fichero fuente sea `.ts`).
- `"strict": true` implícito via `tsconfig.json`. No usar `any` sin justificación.
- Preferir `type` sobre `interface` para estructuras de datos; usar `interface` solo cuando se necesite `implements`.
- **Primer comentario obligatorio**: todo archivo `.ts` nuevo debe iniciar con `// <ruta-relativa-del-archivo>` (ejemplo: `// src/contexts/financial-tracking/domain/entities/financial-item.ts`).

### Nomenclatura
| Elemento | Convención | Ejemplo |
|---|---|---|
| Clases (dominio) | PascalCase | `FinancialItem`, `CategoryName` |
| Value Objects | PascalCase, nombre descriptivo | `Money`, `TransactionDate` |
| Eventos de dominio | PascalCase + sufijo `Event` en el archivo | `ItemRecorded` (clase), `item-recorded.event.ts` (archivo) |
| Errores de dominio | PascalCase + sufijo `Error` | `CategoryNotActiveError` |
| Repositorios (interfaz) | PascalCase + sufijo `Repository` | `FinancialItemRepository` |
| Implementaciones Drizzle | Prefijo `Drizzle` | `DrizzleFinancialItemRepository` |
| Casos de uso | PascalCase + sufijo `UseCase` | `CreateFinancialItemUseCase` |
| Queries | PascalCase + sufijo `Query` | `GetFamilyMembersQuery` |
| Rutas Fastify | kebab-case + sufijo `.routes.ts` | `financial-item.routes.ts` |
| Archivos en general | kebab-case | `category-assignment.ts` |

### Estructura de un Value Object

```typescript
// value-objects/category-name.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidCategoryNameError extends DomainError { ... }

class CategoryName {
  private constructor(private readonly value: string) {}

  static create(raw: string): CategoryName {
    // validación — lanzar error de dominio si falla
    return new CategoryName(raw.trim());
  }

  toString(): string { return this.value; }
  equals(other: CategoryName): boolean { return this.value === other.value; }
}

export { CategoryName, InvalidCategoryNameError };
```

### Estructura de un Aggregate Root

- Hereda de una clase base `AggregateRoot` (o similar) que mantenga la lista de eventos de dominio pendientes.
- Expone un método estático `create(props)` como factory.
- Los métodos de dominio modifican el estado y registran un `DomainEvent` mediante `this.addDomainEvent(...)`.
- No recibe dependencias de infraestructura (repositorios, event bus) — pura lógica de dominio.

### Estructura de un UseCase (comando)

```typescript
class CreateFinancialItemUseCase {
  constructor(
    private readonly repo: FinancialItemRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: CreateFinancialItemInput): Promise<FinancialItem> {
    // 1. Construir VOs — lanzan errores de dominio si los datos son inválidos
    // 2. Lógica de negocio / consultar estado existente
    // 3. Llamar al factory del agregado
    // 4. Persistir
    // 5. Publicar eventos (pullDomainEvents del agregado)
    return item;
  }
}
```

### Estructura de un evento de dominio

```typescript
// events/item-recorded.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";

class ItemRecorded extends DomainEvent {
  constructor(
    readonly itemId: string,
    readonly familyId: string,
    readonly amount: number,
    readonly currency: string,
  ) {
    super("ItemRecorded");
  }
}

export { ItemRecorded };
```

---

## Testing

### Framework y runner

- **`node:test`** nativo. **No usar Jest, Vitest ni ningún otro runner.**
- Importar: `import { describe, test, beforeEach } from "node:test";`
- Assertions: `import assert from "node:assert/strict";`

### Ubicación y nomenclatura

- Los tests se ubican en `tests/`, espejando la estructura de `src/contexts/`.
- Archivo de test: `<nombre>.usecase.test.ts`, `<nombre>.query.test.ts`, `<nombre>.test.ts`.
- Dobles de prueba en `tests/contexts/<contexto>/doubles/` (in-memory repositories, fake event bus, etc.).

### Qué testear

- **Dominio puro** (entidades, value objects, domain services): tests unitarios sin dependencias de infraestructura.
- **Casos de uso**: tests unitarios con dobles (in-memory repositories + fake event bus).
- **Infraestructura** (Drizzle repositories, rutas HTTP): tests de integración opcionales, no obligatorios para avanzar.

### TDD — obligatorio para nuevas funcionalidades

Toda nueva funcionalidad se implementa con **Test-Driven Development**:

1. Escribir el test que falla (red).
2. Implementar el mínimo código para que pase (green).
3. Refactorizar manteniendo los tests en verde (refactor).

No se acepta código de producción nuevo sin un test que lo respalde.

### Convenciones en los tests

- Nombres de tests en **español**, descriptivos del comportamiento: `test("rechaza un nombre de familia vacío", ...)`.
- Cada test es independiente (`beforeEach` para resetear estado).
- Un `describe` por clase/caso de uso bajo test.
- No usar `mock()` de `node:test` para dobles — crear clases in-memory explícitas en `doubles/`.

---

## Reglas de negocio invariantes

Estas reglas deben respetarse siempre:

1. Una `Category` o `Tag` no puede eliminarse si ya tiene `FinancialItem`s asociados — en su lugar se marca `Deprecated` (método `deprecate()`).
2. Un recibo escaneado genera **exactamente un** `FinancialItem`.
3. `Family` gestiona su membresía y debe tener siempre **al menos un Owner**. La operación de remover el último Owner debe fallar.
4. `AI Assistance` **nunca** persiste directamente en el dominio financiero — siempre pasa por `CreateFinancialItemUseCase`.
5. La moneda por defecto de una familia es **CLP**. Cada `FinancialItem` guarda su propia moneda vía el VO `Currency` del shared-kernel.
6. `Financial Tracking` (core domain) **no se suscribe** a eventos de otros contextos.

---

## Autenticación y middleware HTTP

Las rutas Fastify usan dos middlewares en cadena:

1. `authenticate` — verifica el JWT y adjunta `userId` al request.
2. `requireFamilyMembership` — verifica que el `userId` sea miembro de la familia indicada en los parámetros de la ruta; delega en `GetFamilyMembershipQuery`.

Toda ruta que opere sobre datos de una familia debe pasar por ambos middlewares.

---

## Errores de dominio

- Todos los errores de dominio extienden `DomainError` (de `src/shared-kernel/errors/domain-error.ts`).
- Los errores específicos de cada contexto viven en `src/contexts/<contexto>/domain/errors/`.
- Los errores de dominio son parte del lenguaje ubicuo — nombrarlos con precisión (e.g., `CategoryNotActiveError`, no `BadRequestError`).
- **No** usar `throw new Error(...)` genérico en el dominio.

---

## Scripts disponibles

```bash
npm run dev          # Servidor en modo desarrollo (tsx watch)
npm test             # Ejecuta todos los tests
npm run test:watch   # Tests en modo watch
npm run lint         # Biome — solo reporta
npm run lint:fix     # Biome — corrige automáticamente
npm run build        # Compila TypeScript a dist/
npm start            # Arranca el build compilado
```

---

## Ramas de trabajo

Cada nueva funcionalidad debe desarrollarse en una rama dedicada. **Antes de escribir cualquier código**, el agente debe preguntar al usuario:

> ¿Cómo se llamará la rama para esta funcionalidad?

Una vez confirmado el nombre, crear la rama y situarse en ella:

```bash
git checkout -b <nombre-de-rama>
```

No se debe implementar código nuevo directamente en `main` u otras ramas existentes.

---

## Verificaciones obligatorias tras cualquier cambio

Antes de dar por terminada cualquier tarea, el agente **debe ejecutar y confirmar** que los tres comandos siguientes pasan sin errores:

```bash
npm test          # todos los tests deben estar en verde
npm run build     # la compilación TypeScript debe completarse sin errores
npm run lint      # Biome no debe reportar ningún problema
```

Si `npm run lint` reporta errores corregibles automáticamente, ejecutar `npm run lint:fix` y luego volver a verificar con `npm run lint`. No entregar código que falle en ninguno de estos tres pasos.

---

## Qué NO hacer

- No instalar dependencias adicionales (Zod, class-validator, Lodash, etc.) sin discutirlo primero.
- No usar `any` ni casteos dobles (`as unknown as X`) sin justificación.
- No importar código de infraestructura desde la capa de dominio o aplicación.
- No comunicar contextos directamente a nivel de dominio — usar el event bus o llamar al caso de uso público.
- No agregar lógica de negocio en los handlers HTTP de Fastify — van en los casos de uso.
- No escribir tests con `mock()` de `node:test` para repositorios — crear dobles in-memory.
- No omitir la extensión `.js` en las importaciones internas.
- No usar `interface` donde `type` es suficiente.
