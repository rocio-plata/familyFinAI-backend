# FamilyFin AI — Backend

> Smarter family finances.

## a. Descripción general

**FamilyFin AI** es una aplicación móvil para la gestión colaborativa de las finanzas familiares. Varios miembros de una misma familia registran gastos e ingresos, consultan una economía compartida y reciben asistencia de inteligencia artificial para simplificar el registro y generar insights — siempre bajo la filosofía de **"la IA propone, el usuario confirma"**.

Este repositorio corresponde al **backend**: expone la API que consume la app móvil (Kotlin), gestiona la persistencia de datos y orquesta la comunicación con los proveedores de IA, manteniendo el control de acceso y aislamiento de datos entre familias.

El proyecto sigue **Domain-Driven Design (DDD)** con **arquitectura hexagonal** (puertos y adaptadores), organizado en bounded contexts independientes. Ver la sección [Arquitectura](#arquitectura) más abajo para el detalle técnico completo.

## b. Stack tecnológico

Criterio guía: **minimizar dependencias externas** para mantener control sobre la superficie de seguridad del proyecto.

| Capa | Tecnología | Motivo |
|---|---|---|
| Runtime | Node.js LTS + npm | Mejor soporte y estabilidad en despliegue cloud frente a Bun; npm es suficiente para un buen control de dependencias (lockfile, auditoría) |
| Framework HTTP | [Fastify](https://fastify.dev) | Core pequeño, validación de esquemas integrada |
| ORM | [Drizzle ORM](https://orm.drizzle.team) | TypeScript puro, sin binario/engine externo (a diferencia de Prisma) |
| Base de datos | PostgreSQL ([Neon](https://neon.tech)) | Free tier permanente, sin pausas por inactividad, conexión Postgres pura sin capas de plataforma extra |
| Autenticación | JWT propio con [`jose`](https://github.com/panva/jose) | Librería pequeña y auditada, sin SDK de auth de terceros |
| Testing | [`node:test`](https://nodejs.org/api/test.html) (nativo) | Incluido en Node, sin dependencias nuevas ni configuración de bundler |
| Lint / formato | [Biome](https://biomejs.dev) | Un solo binario que reemplaza ESLint + Prettier, sin árbol de plugins |
| App móvil | Kotlin + Jetpack Compose + Ktor Client | Librerías del ecosistema JetBrains/Google, mínima dependencia externa |

## c. Instalación y ejecución

### Requisitos previos

- Node.js LTS (20.x o 22.x) instalado (`node -v` para verificar).
- Una base de datos PostgreSQL — se recomienda [Neon](https://neon.tech) (free tier).
- Cuenta en GitHub con el repositorio clonado localmente.

### Pasos

1. **Clonar el repositorio**
   ```bash
   git clone git@github.com:TU_USUARIO/familyfin-backend.git
   cd familyfin-backend
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Variables de entorno**

   El servidor permite ejecutar el backend con repositorios en memoria o con PostgreSQL. Para desarrollo local con PostgreSQL, crea un archivo `.env`:

   ```dotenv
   PERSISTENCE_MODE=postgres
   DATABASE_URL=postgresql://familyfin:familyfin_dev_password@localhost:5432/familyfin
   JWT_SECRET=dev-secret-change-me
   JWT_ACCESS_TOKEN_EXPIRY=15m
   LOG_LEVEL=debug
   ```

   `.env` no se versiona. También puedes omitir `PERSISTENCE_MODE` para usar `memory`; en ese modo los datos se pierden al reiniciar el proceso.

4. **Inicializar PostgreSQL local** (opcional)
   ```bash
   npm run db:init
   ```

   Este comando levanta el contenedor definido en `docker-compose.yml`, espera a que PostgreSQL esté disponible y aplica las migraciones. Para detenerlo:
   ```bash
   npm run db:down
   ```

5. **Levantar el servidor en modo desarrollo**
   ```bash
   npm run dev
   ```
   El servidor escucha en `http://localhost:3000`. Comprueba su estado con:
   ```bash
   curl http://localhost:3000/health
   ```

6. **Correr los tests**
   ```bash
   npm test
   ```

7. **Correr el lint**
   ```bash
   npm run lint          # solo reporta
   npm run lint:fix      # corrige lo que pueda automáticamente
   ```

8. **Build de producción**
   ```bash
   npm run build
   npm start
   ```

### Scripts disponibles (`package.json`)

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor en modo desarrollo con recarga automática (`tsx watch`) |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Corre el build compilado (producción) |
| `npm test` | Corre los tests unitarios (`node:test`) |
| `npm run lint` | Revisa el código con Biome (sin modificar archivos) |
| `npm run lint:fix` | Revisa y corrige automáticamente lo que Biome pueda resolver |
| `npm run db:up` | Levanta PostgreSQL local con Docker |
| `npm run db:down` | Detiene los servicios de Docker |
| `npm run db:init` | Levanta PostgreSQL y aplica las migraciones |
| `npm run db:reset` | Elimina el volumen local, recrea PostgreSQL y aplica las migraciones |
| `npm run db:generate` | Genera una migración Drizzle a partir del schema |
| `npm run db:migrate` | Aplica las migraciones pendientes |
| `npm run db:studio` | Abre Drizzle Studio |

## d. Estructura del proyecto

El backend está organizado por **bounded contexts** (módulos verticales autocontenidos), cada uno con su propio `domain/` → `application/` → `infrastructure/`:

```
src/
├── contexts/
│   ├── identity/             # Registro, login, perfil y cambio de contraseña
│   ├── family-access/        # Familias, miembros, invitaciones y roles
│   ├── financial-tracking/   # Items financieros, categorías y tags — core domain
│   ├── budgeting/            # Dominio inicial de presupuestos mensuales
│   ├── reporting/            # Read model inicial para agregaciones y consultas
│   └── ai-assistance/        # Reservado para interpretación, recibos e insights
├── shared-kernel/            # Primitivas y errores compartidos entre contextos
└── platform/                 # Fastify, PostgreSQL/Drizzle, auth y event bus

tests/
└── contexts/                 # Espejo de la estructura de src/contexts/, con dobles de prueba en doubles/
```

Cada contexto sigue internamente:

```
<contexto>/
├── domain/
│   ├── entities/           # Aggregate roots y entidades
│   ├── value-objects/      # VOs inmutables
│   ├── events/              # Eventos de dominio publicados por este contexto
│   ├── errors/               # Errores de dominio (extienden DomainError)
│   ├── repositories/          # Puertos de persistencia (interfaces)
│   └── ports/                  # Puertos hacia servicios externos (solo en ai-assistance)
├── application/
│   ├── commands/                # Casos de uso de escritura
│   ├── queries/                   # Casos de uso de lectura
│   └── event-handlers/             # Reacciones a eventos de otros contextos
└── infrastructure/
    ├── persistence/                 # Implementaciones con Drizzle
    ├── http/                         # Rutas Fastify
    └── providers/                     # Adaptadores externos (solo en ai-assistance)
```

Para el detalle del estado de cada contexto, ver `docs/estructura-proyecto.md`.

## e. Funcionalidades principales

- **Economía familiar compartida**: múltiples usuarios de una misma familia, cada uno con su propio login, registrando y consultando la misma información financiera.
- **Registro de gastos e ingresos**: cada movimiento (`FinancialItem`) tiene tipo, categoría obligatoria, tag opcional, título, observación, monto y fecha. Por defecto se asume gasto, para agilizar el registro.
- **Categorías y tags personalizables**: creación, edición y baja (con protección — no se puede eliminar una categoría/tag con movimientos asociados; en su lugar se marca como deprecada).
- **API de identidad y acceso**: registro, login, perfil, cambio de contraseña, familias, invitaciones y membresías.
- **Registro financiero**: categorías, tags y movimientos de gastos/ingresos, con filtros y protección de datos por familia.
- **Presupuestos**: entidades y value objects iniciales; los casos de uso, persistencia y rutas todavía no forman parte de la API registrada por `src/platform/app.ts`.
- **Reportes**: read model inicial para agregaciones por categoría y período; las queries, handlers y rutas todavía no forman parte de la API.
- **Asistencia con IA**: contexto reservado; el diseño está documentado, pero todavía no forma parte de la API.
- **Seguridad y aislamiento**: autenticación por JWT, refresh tokens rotables y autorización mediante pertenencia a la familia.

## f. Usuario y contraseña de prueba

Para pruebas en ambiente de desarrollo:

| Campo | Valor |
|---|---|
| Usuario | `aaaa` |
| Contraseña | `bbbb` |

> ⚠️ Credenciales únicamente para desarrollo/pruebas locales. No deben usarse ni existir en ningún ambiente de producción.

---

## Arquitectura

El backend sigue **Domain-Driven Design (DDD)** con **arquitectura hexagonal** (puertos y adaptadores). El dominio de cada contexto nunca depende de Fastify, Drizzle ni de proveedores externos.

### Bounded Contexts

| Contexto | Responsabilidad | Rol |
|---|---|---|
| **Family & Access** | Familias, miembros, invitaciones, roles | Upstream — ancla al resto |
| **Financial Tracking** | Items financieros, categorías, tags | Core domain |
| **Budgeting** | Presupuestos mensuales por categoría | Soporte |
| **Reporting & Analytics** | Agregaciones, comparaciones, drill-down | Consumidor (read models) |
| **AI Assistance** | Interpretación de texto, recibos, clasificación, consultas e insights | Genérico — nunca escribe directo en el dominio financiero |

### Reglas de negocio clave

- Una **Category** o **Tag** no puede eliminarse físicamente si ya tiene items asociados — se marca como **deprecada** (`deprecate()`), preservando el histórico.
- El orden de los tags dentro de una categoría es **manual** (`displayOrder`), controlado por el usuario.
- Un recibo escaneado siempre genera **un único** `FinancialItem`.
- `Family` es el único agregado que gestiona su membresía: siempre debe quedar al menos un `Owner`.
- La moneda por defecto de una familia es **CLP**, configurable a futuro; cada `FinancialItem` guarda su propia moneda vía el Value Object `Currency` (en `shared-kernel`).

### Comunicación entre contextos

- **Síncrona** (llamada a caso de uso público de otro contexto): cuando el origen necesita el resultado para continuar. Ej.: `AI Assistance` confirmando una sugerencia llama al caso de uso `CreateFinancialItem` de `Financial Tracking`.
- **Asíncrona** (eventos de dominio vía event bus in-process): cuando el destino solo reacciona. Ej.: `ItemRecorded` es escuchado por `Budgeting` y `Reporting`.

`Financial Tracking`, como core domain, **nunca se suscribe a eventos de otros contextos** — solo los publica.

#### Principales eventos publicados

- `Family & Access`: `FamilyCreated`, `MemberInvited`, `InvitationAccepted`, `MemberRemoved`, `MemberRoleChanged`
- `Financial Tracking`: `ItemRecorded`, `ItemAmountChanged`, `ItemReclassified`, `ItemDeleted`, `CategoryDeprecated`, `TagDeprecated`
- `Budgeting`: `BudgetCreated`, `BudgetOverspent`, `BudgetPeriodClosed`
- `AI Assistance`: `SuggestionGenerated`, `SuggestionConfirmed`, `SuggestionDiscarded`, `MerchantCategoryLearned`

### IA — Anticorruption Layer

`AI Assistance` nunca escribe directamente en el dominio financiero ni expone formatos de proveedores externos al resto del sistema. Cada capacidad de IA se define como un **puerto**, implementado por un **adaptador** que traduce la respuesta cruda del proveedor a conceptos propios del dominio:

- `NaturalLanguageParserPort` → interpretación de texto libre.
- `ReceiptScannerPort` → escaneo de recibos, siempre produce una única `ReceiptSuggestion`.
- `NaturalLanguageQueryPort` → *(pendiente de definir)* consultas en lenguaje natural sobre las finanzas familiares.

Antes de invocar a un proveedor de IA, los casos de uso consultan primero el historial de asociaciones ya conocidas (`MerchantCategoryHistory`), evitando llamadas innecesarias y reduciendo costes.

### Autenticación y autorización

- **Autenticación** (identidad): JWT de acceso de corta duración (15 min) + refresh token opaco de larga duración (30 días), con rotación y detección de reuso. Vive en `platform/auth`.
- **Autorización** (pertenencia y rol dentro de una familia): consulta al agregado `Family` vía su fachada pública (`GetFamilyMembershipQuery`).

```
authenticate (¿quién eres?) → requireFamilyMembership (¿perteneces y con qué rol?) → handler del contexto
```

### Seguridad

- La app móvil no maneja credenciales de base de datos ni API keys de proveedores de IA.
- Aislamiento de datos a nivel de familia: `User → Family → Family Data`.
- Refresh tokens revocables y rotación con detección de robo.
- Uso de IA limitado a lo estrictamente necesario para controlar costes en free tiers.

### Metodología de desarrollo

El desarrollo de casos de uso sigue **TDD** (Red → Green → Refactor), con `node:test` y dobles de prueba (in-memory repositories, fakes) para aislar el dominio de la infraestructura real.

## Estado actual

**Implementado (dominio, aplicación e infraestructura, con TDD y dobles in-memory):**

- **Family & Access** — los casos de uso de familias, miembros, invitaciones, roles, moneda y orden de familias, junto con sus rutas HTTP, repositorios in-memory y adaptadores Drizzle sobre PostgreSQL.
- **Financial Tracking** (core domain) — los casos de uso de movimientos financieros, categorías y tags, junto con sus rutas HTTP, repositorios in-memory y adaptadores Drizzle sobre PostgreSQL.
- Eventos de dominio entre contextos, event bus in-process (`platform/events`), y flujo de autenticación/autorización (JWT con rotación de refresh tokens, middlewares `authenticate`/`requireFamilyMembership`) en `platform/auth`.
- Anticorruption layer de `AI Assistance` definida a nivel de diseño (puertos), sin adaptadores concretos todavía.

**Pendiente:**

- `Budgeting`: entidades y value objects iniciales (`BudgetConfiguration`, `BudgetPeriodStatus`, `Period` y `BudgetBalance`); quedan pendientes los casos de uso, repositorios, handlers y rutas.
- `Reporting & Analytics`: entidad `CategoryPeriodAggregate` y value object `ItemCount`; reutiliza `Period` desde `shared-kernel`. Quedan pendientes los casos de uso, repositorios, handlers y rutas.
- `AI Assistance`: solo existe el andamiaje de carpetas (`domain/`, `application/`, `infrastructure/`), sin entidades ni casos de uso implementados.
- Proveedores concretos para `AI Assistance`, como los adaptadores de interpretación de lenguaje natural y escaneo de recibos.
- `NaturalLanguageQueryPort` (consultas en lenguaje natural sobre las finanzas familiares) y el resto de los puertos/adaptadores de IA.
- Resolución del `Currency` por defecto de la familia dentro de `CreateFinancialItem` (hoy recibe el monto ya construido con su moneda).
- Roles/permisos granulares para los casos de uso de `FinancialItem` (`CreateFinancialItem`, `UpdateFinancialItem`, `ReclassifyFinancialItem`, `DeleteFinancialItem` no validan rol todavía) y estrategia de despliegue.