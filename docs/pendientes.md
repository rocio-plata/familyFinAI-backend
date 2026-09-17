# Pendientes del proyecto

Este documento reúne la situación real del repositorio y clasifica cada punto por su estado actual:
`Resuelto`, `Pendiente` u `Opcional`.

## Checklist global

### Resuelto

- [x] Duplicación del query `GetFamilyMembershipQuery` eliminada del árbol de `application`.
- [x] Ruta real de `Financial Tracking` corregida y alineada con el código: `src/contexts/financial-tracking/infrastructure/http/financial-tracking.routes.ts`.
- [x] `UnitOfWork` implementado en `src/platform/db/unit-of-work.ts` y usado en la composición de la app.
- [x] Endpoints de `Budgeting` y `Reporting` implementados y registrados en la app.
- [x] Soporte dual InMemory/Postgres según `PERSISTENCE_MODE`.
- [x] Autenticación + `requireFamilyMembership` funcionando en rutas de familia.
- [x] Validación HTTP por JSON Schema en rutas de Fastify.
- [x] Orden de persistencia/publicación en `CreateFinancialItemUseCase` corregido.

### Pendiente

- [ ] Definir y publicar el evento `BudgetOverspent` cuando un status mensual cruce el límite.
- [ ] Implementar notificaciones reales por email para invitaciones.
- [ ] Definir estrategia de pruebas de integración contra PostgreSQL en CI (aún no hay job de CI que las ejecute; localmente ya existe un primer ejemplo, ver más abajo).
- [x] Ejecutar `npm run db:reset` y aplicar la migración inicial desde una base vacía.
- [ ] Automatizar en CI la verificación reproducible de `db:reset`/`db:migrate`.
- [x] Añadir pruebas end-to-end que cubran creación, actualización, reclasificación y borrado de un movimiento y validen el read model de `Reporting`: `tests/e2e/financial-item-lifecycle.test.ts` — levanta `buildApp()` con dependencias reales (Drizzle + Postgres), usa `app.inject()` (nativo de Fastify, sin librerías nuevas) para ejercitar todo el flujo HTTP: `POST /auth/register` → crea categorías y medio de pago → crea, actualiza, reclasifica y borra un movimiento → valida en cada paso `GET /families/:familyId/reports/breakdown`. Se ejecuta con `npm run test:e2e` (vive en `tests/e2e/`, se salta automáticamente si `DATABASE_URL` no está definida, igual que los de integración). Nota: el test crea explícitamente el medio de pago y lo pasa por `paymentMethodId` porque `OnFamilyCreatedHandler` de medios de pago todavía no está suscrito al `EventBus` (ver pendiente relacionado más abajo).
- [x] Suite e2e extendida con 4 flujos adicionales en `tests/e2e/` (helper compartido `build-e2e-app.ts`): `budgeting-lifecycle.test.ts` (presupuesto reacciona a alta/edición/borrado de un movimiento vía `EventBus`), `family-invitation-flow.test.ts` (invitar por email + aceptar + verificar membresía), `payment-method-lifecycle.test.ts` (renombrar, fijar default, bloqueo de borrado por ser default o tener items asociados, borrado libre), `reporting-dashboard.test.ts` (trend/comparison/dashboard con movimientos en dos períodos). Total 5 tests e2e, todos con limpieza robusta en `finally` (incluye categorías por defecto creadas por `CreateDefaultCategoriesOnFamilyCreatedEventHandler`, que no tienen FK hacia `families` y por eso no se borran en cascada).
- [ ] Mantener documentada la decisión actual de permisos para movimientos: membresía sí, rol `Owner` no obligatorio.
- [ ] Revisar si `Budgeting`/`Financial Tracking` necesitan permisos más granulares en producto.
- [x] Primer test de integración contra PostgreSQL real: `tests/integration/contexts/financial-tracking/infrastructure/persistence/payment-method.repository.test.ts` cubre `DrizzlePaymentMethodRepository` y `DrizzleUserPaymentMethodPreferenceRepository` (save/find/delete). Los tests de integración viven en `tests/integration/` (mirroring de `src/contexts/`, separado de los unit tests) y se ejecutan con `npm run test:integration`; se saltan automáticamente dentro de `npm test` si `DATABASE_URL` no está definida.
- [x] Patrón de test de integración extendido a los 11 repositorios Drizzle restantes: `category.repository.test.ts`, `financial-item.repository.test.ts` (financial-tracking); `family.repository.test.ts`, `invitation.repository.test.ts` (family-access); `user.repository.test.ts` (identity); `budget-configuration.repository.test.ts`, `budget-period-status.repository.test.ts` (budgeting); `category-period-aggregate.repository.test.ts`, `payment-method-period-aggregate.repository.test.ts` (reporting). 15 tests en total, todos verificados contra Postgres real sin dejar filas huérfanas.
- [x] `resolveHttpStatus` no mapeaba `PAYMENT_METHOD_IS_SOMEONES_DEFAULT` a un status de conflicto (caía al 400 por defecto, inconsistente con `HAS_ASSOCIATED_ITEMS`/`ALREADY_MEMBER`). Corregido agregando la regla de sufijo `IS_SOMEONES_DEFAULT` → 409, detectado por `tests/e2e/payment-method-lifecycle.test.ts`.

### Opcional

- [ ] Evaluar mover `Money` a `shared-kernel` para evitar depender del dominio interno de `Financial Tracking`.
- [ ] Revisar índices adicionales usando métricas reales de consultas.
- [ ] Evaluar la estrategia de pool de conexiones si el despliegue final es serverless.
- [ ] Revisar y estabilizar DTOs HTTP de consultas como `GetFamilyMembers` para la app móvil.

### Decisiones de producto ya cerradas

- [x] Los presupuestos serán modificables por cualquier `Member` de la familia; no se exige rol `Owner`.
- [x] `CategoryPeriodAggregate` mantendrá separados `totalExpense`, `totalIncome`, `count` y otros valores por categoría, en lugar de un único total agregado.
- [x] `Reporting` no hará backfill histórico; el read model se alimenta solo con eventos nuevos tras reset.

## Budgeting

### Pendiente

- Definir y publicar el evento `BudgetOverspent` cuando un status mensual cruce el límite.

### Resuelto

- [x] Integración end-to-end: `tests/e2e/budgeting-lifecycle.test.ts` crea un movimiento por HTTP y verifica que actualiza `BudgetPeriodStatus` a través del `EventBus` (alta, edición que cruza el límite y borrado).

### Decisión cerrada

- Los presupuestos serán modificables por cualquier `Member` de la familia; no se exige rol
  `Owner` para estas operaciones.

### Opcional

- Evaluar mover `Money` a `shared-kernel` para evitar que Budgeting dependa del dominio interno de
  Financial Tracking.

## Family & Access

### Pendiente

- Implementar notificaciones reales por email para las invitaciones; actualmente están fuera del
  alcance funcional inmediato.
- Revisar y estabilizar los DTOs HTTP de consultas como `GetFamilyMembers` según las necesidades de
  la app móvil.

### Opcional

- Evaluar permisos más granulares para `InviteMember` y `RemoveMember`.

## Financial Tracking

### Pendiente

- Mantener documentada la decisión actual de permisos: las operaciones sobre movimientos requieren
  membresía, pero no un rol `Owner`; revisar si el producto necesita permisos más granulares.
- Añadir pruebas de integración contra PostgreSQL para repositorios y migraciones.

### Medios de pago

- Componer los casos de uso y handlers de medios de pago en `financial-tracking.module.ts`.
- Registrar `OnFamilyCreatedHandler`, `OnInvitationAcceptedHandler` y `OnMemberRemovedHandler` en el `EventBus`.
- Añadir pruebas HTTP específicas para las rutas de medios de pago y default por usuario.
- Verificar de forma automatizada que la migración `0006_icy_shriek.sql` aplicada mediante `npm run db:reset` permanece reproducible; no se conservarán datos anteriores ni se hará backfill.

## Reporting

### Pendiente

- Añadir pruebas end-to-end que cubran crear, actualizar, reclasificar y borrar un movimiento y
  verifiquen el read model de Reporting.
- Añadir pruebas HTTP específicas para `/families/:familyId/reports/by-payment-method`.
- Añadir pruebas end-to-end para `PaymentMethodPeriodAggregate` y el reporte por medio de pago.

### Decisiones cerradas

- No se hará backfill histórico en `Reporting`; después de un reset, el read model comienza vacío y
  solo se alimenta con eventos nuevos.
- `CategoryPeriodAggregate` se mantiene con los valores por separado (`totalExpense`, `totalIncome`,
  `count` y otros datos de agregación) en lugar de un único total global.

## Persistencia y plataforma

### Pendiente

- Definir y ejecutar una estrategia de pruebas de integración contra PostgreSQL en CI o mediante
  una base de datos local de test.
- Verificar de forma automatizada `db:reset`, `db:migrate` y la migración inicial desde una base
  vacía.

### Opcional

- Revisar índices adicionales usando métricas reales de consultas.
- Evaluar la estrategia de pool de conexiones si el despliegue final es serverless.

## Criterio de cierre

Un punto se considera resuelto cuando su implementación, pruebas y documentación reflejan el
comportamiento real del sistema. Si un ítem no está en código ni en tests ni en documentación,
no debe aparecer como `Resuelto`.
