# FamilyFin AI Backend: estructura actual

Este documento describe el estado implementado del repositorio. Los diseños funcionales de
contextos todavía no implementados se mantienen en los documentos de casos de uso y se marcan
como pendientes allí.

## Mapa de alto nivel

```text
src/
├── contexts/
│   ├── identity/             # Usuarios, registro, login y perfil
│   ├── family-access/        # Familias, miembros, invitaciones y membresías
│   ├── financial-tracking/   # Categorías, tags y movimientos financieros
│   ├── budgeting/            # Reservado: aún sin implementación
│   ├── reporting/            # Read model inicial de agregaciones
│   └── ai-assistance/        # Reservado: aún sin implementación
├── platform/
│   ├── auth/                 # JWT, refresh tokens y middleware
│   ├── db/                   # Drizzle, schema, migraciones y unit of work
│   ├── events/               # Event bus en memoria
│   ├── http/                 # Manejo HTTP de errores
│   ├── app.ts                # Composición de Fastify y registro de módulos
│   └── server.ts             # Selección de persistencia y arranque
└── shared-kernel/            # Eventos, value objects y errores compartidos

tests/
├── contexts/                 # Tests de identidad, acceso familiar y tracking financiero
├── platform/                 # Tests de app, auth, HTTP y workflows
└── shared-kernel/            # Tests de primitivas compartidas
```

## Contextos implementados

### Identity

Contiene el agregado `User`, los casos de uso de registro, login, cambio de contraseña y
actualización del nombre visible. Expone las rutas de identidad y usa repositorios in-memory o
Drizzle según `PERSISTENCE_MODE`.

### Family & Access

Gestiona familias, miembros, invitaciones, roles y moneda predeterminada. Sus consultas de
membresía y pertenencia son utilizadas por los demás contextos para autorizar operaciones.

### Financial Tracking

Contiene `FinancialItem`, `Category` y `Tag`, además de sus value objects, errores, repositorios,
casos de uso y rutas HTTP. Publica eventos de dominio para que otros contextos puedan reaccionar.

## Contextos reservados

`Budgeting` tiene un modelo de dominio inicial (`BudgetConfiguration`, `BudgetPeriodStatus`,
`Period` y `BudgetBalance`), pero todavía no registra casos de uso, persistencia, handlers ni
rutas. `Reporting` tiene el read model inicial `CategoryPeriodAggregate` y el value object
`ItemCount`; reutiliza `Period` desde `shared-kernel`, pero todavía no registra queries,
persistencia, handlers ni rutas. `AI Assistance` conserva
únicamente la estructura de carpetas y archivos `.gitkeep`. Sus documentos de diseño no
representan endpoints disponibles ni código ejecutado por `src/platform/app.ts`.

## Infraestructura y composición

- `src/platform/app.ts` registra `/health`, Identity, Auth, Family & Access y Financial Tracking.
- `src/platform/server.ts` selecciona repositorios in-memory por defecto o adaptadores Drizzle
  cuando `PERSISTENCE_MODE=postgres`.
- PostgreSQL se ejecuta localmente con `docker-compose.yml`; las migraciones están en
  `src/platform/db/migrations/`.
- El event bus actual es in-process; no hay todavía un broker externo.
- La suite usa `node:test` y dobles in-memory para los casos de uso.

## Capas por contexto

Los contextos implementados siguen, de forma general, esta separación:

```text
<contexto>/
├── domain/          # Entidades, value objects, eventos, errores y puertos
├── application/     # Commands, queries y workflows/event handlers
└── infrastructure/  # Rutas Fastify, repositorios y adaptadores
```

La dependencia apunta hacia el dominio: la lógica de negocio no depende de Fastify, Drizzle ni
de proveedores externos.

## Estado de implementación

| Área | Estado |
|---|---|
| Identity | Implementado con memoria y PostgreSQL |
| Family & Access | Implementado con memoria y PostgreSQL |
| Financial Tracking | Implementado con memoria y PostgreSQL |
| Auth y refresh tokens | Implementado con memoria y PostgreSQL |
| Budgeting | Entidades y value objects iniciales; aplicación e infraestructura pendientes |
| Reporting | Queries, handlers y persistencia del read model `CategoryPeriodAggregate` implementados; composición y rutas pendientes |
| AI Assistance | Diseño/documentación parcial; implementación pendiente |
