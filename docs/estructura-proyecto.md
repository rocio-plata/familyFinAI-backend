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
│   ├── budgeting/            # Casos de uso iniciales de presupuestos mensuales
│   ├── reporting/            # Queries, handlers, persistencia y endpoints de Reporting
│   └── ai-assistance/        # Sugerencias de texto/recibos, HTTP y persistencia
├── platform/
│   ├── auth/                 # JWT, refresh tokens y middleware
│   ├── db/                   # Drizzle, schema, migraciones y unit of work
│   ├── events/               # Event bus en memoria
│   ├── http/                 # Manejo HTTP de errores
│   ├── app.ts                # Composición de Fastify y registro de módulos
│   └── server.ts             # Selección de persistencia y arranque
└── shared-kernel/            # Eventos, value objects y errores compartidos

tests/
├── unit/                     # Tests de dominio, aplicación y rutas con dobles in-memory
├── integration/              # Tests de persistencia contra PostgreSQL
├── e2e/                      # Flujos HTTP completos contra PostgreSQL
├── platform/                 # Tests transversales de plataforma
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

## Otros contextos y estado

`Budgeting` tiene implementados sus comandos/queries, handlers, persistencia InMemory y Drizzle,
composición, rutas HTTP y cobertura e2e; queda pendiente la definición del evento `BudgetOverspent`
y algunas decisiones de negocio secundarias. `Reporting` tiene implementados los read models
`CategoryPeriodAggregate` y `PaymentMethodPeriodAggregate`, seis queries, ocho event handlers,
persistencia InMemory y Drizzle, composición, suscripciones al `EventBus`, seis rutas HTTP y
tests HTTP/e2e.
`AI Assistance` está implementado hasta la Fase 4: dominio, adaptadores fake determinísticos,
los cuatro casos de uso núcleo, rutas HTTP, persistencia Drizzle/in-memory, migración y composición
en `src/platform/app.ts` y `src/platform/server.ts`. Las Fases 5 y 6 siguen pendientes: definir
`AskFinancialQuestion`/`GenerateInsights` y añadir rate limiting de uso de IA.

## Infraestructura y composición

- `src/platform/app.ts` registra `/health`, Identity, Auth, Family & Access, Financial Tracking, Budgeting, Reporting y AI Assistance cuando se proporcionan sus dependencias.
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
| Budgeting | Completamente implementado con memoria y PostgreSQL; quedan pendientes decisiones funcionales y eventos secundarios |
| Reporting | Queries, handlers, persistencia, composición y endpoints de los read models por categoría y medio de pago implementados |
| AI Assistance | Fases 0-4 implementadas; Fases 5-6 pendientes |
