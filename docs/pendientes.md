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
- [x] Migración inicial aplicada desde una base vacía vía `npm run db:reset`.
- [x] Casos de uso y rutas HTTP de medios de pago compuestos en `financial-tracking.module.ts` y expuestos en `financial-tracking.routes.ts` (ver detalle en sección `Financial Tracking`).
- [x] Suite de tests de integración contra PostgreSQL real: 15 tests cubriendo los 11 repositorios Drizzle del proyecto, en `tests/integration/` (`npm run test:integration`, se salta sin `DATABASE_URL`).
- [x] Suite de tests end-to-end: 6 flujos HTTP completos contra Postgres real en `tests/e2e/` (`npm run test:e2e`, helper compartido `build-e2e-app.ts`): ciclo de vida de un movimiento (con read model de Reporting), presupuesto reaccionando vía `EventBus`, invitación y aceptación de miembro, ciclo de vida de medios de pago, dashboard/trend/comparison y reporte por medio de pago.
- [x] `resolveHttpStatus` no mapeaba `PAYMENT_METHOD_IS_SOMEONES_DEFAULT` a un status de conflicto (caía al 400 por defecto). Corregido agregando la regla de sufijo `IS_SOMEONES_DEFAULT` → 409, detectado por `tests/e2e/payment-method-lifecycle.test.ts`.
- [x] `OnFamilyCreatedHandler`, `OnInvitationAcceptedHandler` y `OnMemberRemovedHandler` de medios de pago suscritos al `EventBus` (ver detalle en sección `Financial Tracking` → `Medios de pago`). Los tests e2e ya no crean el medio de pago manualmente; dependen del que se crea automáticamente al registrar la familia.

### Pendiente

- [ ] Definir y publicar el evento `BudgetOverspent` cuando un status mensual cruce el límite.
- [ ] Implementar notificaciones reales por email para invitaciones.
- [ ] Automatizar en CI la ejecución de `npm run test:integration` / `npm run test:e2e` y la verificación reproducible de `db:reset`/`db:migrate` (ver detalle en sección `Persistencia y plataforma`).
- [x] Tests HTTP dedicados para las rutas de medios de pago (ver detalle en sección `Financial Tracking` → `Medios de pago`).
- [x] Tests HTTP/e2e dedicados para el reporte por medio de pago (ver detalle en sección `Reporting`).
- [ ] Mantener documentada la decisión actual de permisos para movimientos: membresía sí, rol `Owner` no obligatorio.
- [ ] Revisar si `Budgeting`/`Financial Tracking` necesitan permisos más granulares en producto.
- [x] `Money` movido a `shared-kernel/domain/money.ts` (junto con `InvalidMoneyError` en `shared-kernel/errors/`, código `SHARED.INVALID_MONEY`); `Budgeting` y `Reporting` ya no dependen del dominio interno de `Financial Tracking` para este VO. Test movido a `tests/unit/shared-kernel/domain/money.test.ts`.
- [x] Suite unitaria actual: 806 tests ejecutados con `npm test`; suite de integración: 15 tests; suite e2e: 6 tests. Todas las suites se ejecutan con scripts separados para evitar mezclar tests in-memory con PostgreSQL real.

### Opcional

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

### Resuelto

- [x] Pruebas de integración contra PostgreSQL para los repositorios Drizzle de `Financial Tracking` (categorías, movimientos, medios de pago, preferencias) en `tests/integration/contexts/financial-tracking/`.

### Medios de pago

- [x] Casos de uso y rutas HTTP de medios de pago compuestos en `financial-tracking.module.ts` (`CreatePaymentMethodUseCase`, `RenamePaymentMethodUseCase`, `DeprecatePaymentMethodUseCase`, `DeletePaymentMethodUseCase`, `SetDefaultPaymentMethodUseCase`, `GetPaymentMethodsQuery`) y expuestos por HTTP en `financial-tracking.routes.ts` (crear, listar, renombrar, deprecar, borrar, fijar default).
- [x] `OnFamilyCreatedHandler`, `OnInvitationAcceptedHandler` y `OnMemberRemovedHandler` (medios de pago) suscritos al `EventBus` en `financial-tracking.module.ts`. Al crear una familia se generan automáticamente 4 medios de pago por defecto (Efectivo, Tarjeta de Débito, Tarjeta de Crédito, Transferencia) y se fija "Efectivo" como preferencia del creador; al aceptar una invitación se fija "Efectivo" como preferencia inicial del nuevo miembro; al remover un miembro se borra su preferencia. Probado con test de composición (`tests/unit/contexts/financial-tracking/financial-tracking.module.test.ts`, publica los eventos sobre un `FakeEventBus` y verifica los efectos) y validado end-to-end (los tests de `tests/e2e/` ya no crean el medio de pago manualmente, dependen del que se crea al registrar).
- [x] Tests HTTP dedicados (`.route.test.ts`) para las 6 rutas de medios de pago y default por usuario: `create-payment-method.route.test.ts`, `get-payment-methods.route.test.ts`, `rename-payment-method.route.test.ts`, `deprecate-payment-method.route.test.ts`, `delete-payment-method.route.test.ts`, `set-default-payment-method.route.test.ts` (30 tests). Cubren éxito, autenticación, membresía, duplicados, no encontrado, conflictos (asociado a items / default de un usuario) y medio de pago deprecado.
- [x] Migración `0006_icy_shriek.sql` aplicada mediante `npm run db:reset`; queda pendiente automatizar en CI la verificación de que `db:reset`/`db:migrate` siguen siendo reproducibles (ver sección Persistencia y plataforma).

## Reporting

### Resuelto

- [x] Test HTTP dedicado `get-expenses-by-payment-method.route.test.ts` para `/families/:familyId/reports/by-payment-method`: agrupación por medio de pago, período sin movimientos, validación de `period` requerido y con formato inválido.
- [x] Test end-to-end dedicado `tests/e2e/reporting-by-payment-method.test.ts`: dos movimientos con medios de pago distintos (uno con el "Efectivo" automático, otro con uno creado explícitamente) se reflejan correctamente en `/reports/by-payment-method` contra Postgres real.

### Decisiones cerradas

- No se hará backfill histórico en `Reporting`; después de un reset, el read model comienza vacío y
  solo se alimenta con eventos nuevos.
- `CategoryPeriodAggregate` se mantiene con los valores por separado (`totalExpense`, `totalIncome`,
  `count` y otros datos de agregación) en lugar de un único total global.

## Persistencia y plataforma

### Resuelto

- [x] Estrategia de pruebas contra PostgreSQL real definida y en uso local: `tests/integration/` (repositorios Drizzle, `npm run test:integration`) y `tests/e2e/` (flujos HTTP completos, `npm run test:e2e`); ambas requieren `DATABASE_URL` y se saltan automáticamente si no está definida.

### Pendiente

- Automatizar en CI la ejecución de `npm run test:integration` y `npm run test:e2e` (hoy solo se ejecutan localmente; no hay job de CI que levante Postgres y las corra).
- Verificar de forma automatizada en CI que `db:reset`, `db:migrate` y la migración inicial siguen siendo reproducibles desde una base vacía.

### Opcional

- Revisar índices adicionales usando métricas reales de consultas.
- Evaluar la estrategia de pool de conexiones si el despliegue final es serverless.

## Criterio de cierre

Un punto se considera resuelto cuando su implementación, pruebas y documentación reflejan el
comportamiento real del sistema. Si un ítem no está en código ni en tests ni en documentación,
no debe aparecer como `Resuelto`.
