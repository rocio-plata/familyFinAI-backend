# FamilyFin AI — Backend

> Smarter family finances.

Backend del proyecto **FamilyFin AI**, una aplicación móvil para la gestión colaborativa de las finanzas familiares. Varios miembros de una misma familia registran y consultan una economía compartida, con asistencia de IA para simplificar el registro y generar insights — siempre bajo la filosofía de **"la IA propone, el usuario confirma"**.

## Stack tecnológico

Criterio guía: **minimizar dependencias externas** para mantener control sobre la superficie de seguridad del proyecto.

| Capa | Tecnología | Motivo |
|---|---|---|
| Runtime | Node.js  |  |
| Framework HTTP | [Fastify](https://fastify.dev) | Core pequeño, validación de esquemas integrada |
| ORM | [Drizzle ORM](https://orm.drizzle.team) | TypeScript puro, sin binario/engine externo (a diferencia de Prisma) |
| Base de datos | PostgreSQL ([Neon](https://neon.tech)) | Free tier permanente, sin pausas por inactividad, conexión Postgres pura sin capas de plataforma extra |
| Autenticación | JWT propio con [`jose`](https://github.com/panva/jose) | Librería pequeña y auditada, sin SDK de auth de terceros |
| App móvil | Kotlin + Jetpack Compose + Ktor Client | Librerías del ecosistema JetBrains/Google, mínima dependencia externa |

## Arquitectura

El backend sigue **Domain-Driven Design (DDD)** con **arquitectura hexagonal** (puertos y adaptadores). Cada bounded context es un módulo vertical autocontenido: el dominio nunca depende de Fastify, Drizzle ni de proveedores externos.

```
src/
├── contexts/
│   ├── family-access/
│   ├── financial-tracking/    # core domain
│   ├── budgeting/
│   ├── reporting/
│   └── ai-assistance/
│       └── domain/ports/      # anticorruption layer hacia proveedores de IA
├── shared-kernel/             # Entity, AggregateRoot, DomainEvent — mínimo común
└── platform/                  # infraestructura transversal: server, db, auth
```

Cada contexto sigue el mismo patrón interno: `domain/` (entidades, value objects, eventos, puertos) → `application/` (casos de uso, commands, queries) → `infrastructure/` (adaptadores concretos: HTTP, persistencia, proveedores externos).

## Bounded Contexts

| Contexto | Responsabilidad | Rol |
|---|---|---|
| **Family & Access** | Familias, miembros, invitaciones, roles | Upstream — ancla al resto |
| **Financial Tracking** | Items financieros, categorías, tags | Core domain |
| **Budgeting** | Presupuestos mensuales por categoría | Soporte |
| **Reporting & Analytics** | Agregaciones, comparaciones, drill-down | Consumidor (read models) |
| **AI Assistance** | Interpretación de texto, recibos, clasificación, consultas e insights | Genérico — nunca escribe directo en el dominio financiero |

### Reglas de negocio clave

- Una **Category** o **Tag** no puede eliminarse físicamente si ya tiene items asociados — en su lugar se marca como **deprecada** (`deprecate()`), dejando de estar disponible para nuevos registros pero preservando el histórico.
- El orden de los tags dentro de una categoría es **manual** (`displayOrder`), controlado por el usuario — no se calcula por frecuencia de uso, para evitar acoplamiento entre agregados y contención de escritura.
- Un recibo escaneado siempre genera **un único** `FinancialItem` — nunca se divide automáticamente.
- `Family` es el único agregado que gestiona su membresía: siempre debe quedar al menos un `Owner`.

## Comunicación entre contextos

- **Síncrona** (llamada a caso de uso público de otro contexto): cuando el origen necesita el resultado para continuar. Ej.: `AI Assistance` confirmando una sugerencia llama al caso de uso `CreateFinancialItem` de `Financial Tracking`.
- **Asíncrona** (eventos de dominio vía event bus in-process): cuando el destino solo reacciona, sin bloquear al origen. Ej.: `ItemRecorded` es escuchado por `Budgeting` (recalcula presupuesto) y `Reporting` (actualiza agregados).

`Financial Tracking`, como core domain, **nunca se suscribe a eventos de otros contextos** — solo los publica. Su única entrada externa es la llamada síncrona explícita de casos de uso públicos.

### Principales eventos publicados

- `Family & Access`: `FamilyCreated`, `MemberInvited`, `InvitationAccepted`, `MemberRemoved`, `MemberRoleChanged`
- `Financial Tracking`: `ItemRecorded`, `ItemAmountChanged`, `ItemReclassified`, `ItemDeleted`, `CategoryDeprecated`, `TagDeprecated`
- `Budgeting`: `BudgetCreated`, `BudgetOverspent`, `BudgetPeriodClosed`
- `AI Assistance`: `SuggestionGenerated`, `SuggestionConfirmed`, `SuggestionDiscarded`, `MerchantCategoryLearned`

## IA — Anticorruption Layer

`AI Assistance` nunca escribe directamente en el dominio financiero ni expone formatos de proveedores externos (OpenAI, servicios de visión, etc.) al resto del sistema. Cada capacidad de IA se define como un **puerto** en el dominio, implementado por un **adaptador** en infraestructura que traduce la respuesta cruda del proveedor a conceptos propios del dominio:

- `NaturalLanguageParserPort` → interpretación de texto libre ("I spent $25,000 on gas yesterday")
- `ReceiptScannerPort` → escaneo de recibos, siempre produce una única `ReceiptSuggestion`
- (pendiente) `NaturalLanguageQueryPort` → consultas en lenguaje natural sobre las finanzas familiares

Antes de invocar a un proveedor de IA, los casos de uso consultan primero el historial de asociaciones ya conocidas (`MerchantCategoryHistory`), evitando llamadas innecesarias y reduciendo costes.

## Autenticación y autorización

- **Autenticación** (identidad): JWT de acceso de corta duración (15 min) + refresh token opaco de larga duración (30 días), con rotación y detección de reuso. Vive en `platform/auth`, es infraestructura transversal sin lógica de negocio.
- **Autorización** (pertenencia y rol dentro de una familia): consulta al agregado `Family` a través de su fachada pública (`GetFamilyMembershipQuery`) — la única fuente de verdad sobre membresía y roles.

```
authenticate (¿quién eres?) → requireFamilyMembership (¿perteneces y con qué rol?) → handler del contexto
```

## Seguridad

- La app móvil no maneja credenciales de base de datos ni API keys de proveedores de IA.
- Aislamiento de datos a nivel de familia: `User → Family → Family Data`.
- Refresh tokens revocables y rotación con detección de robo.
- Uso de IA limitado a lo estrictamente necesario (texto libre, recibos, consultas, insights) para controlar costes en free tiers.

## Estado actual

**Definido:** bounded contexts, entidades y value objects de `Financial Tracking` y `Family & Access`, anticorruption layer de `AI Assistance`, eventos de dominio entre contextos, flujo de autenticación/autorización.

**Pendiente:** modelo de datos concreto en Postgres, `NaturalLanguageQueryPort`, diseño de tests, roles/permisos granulares, estrategia de despliegue.
