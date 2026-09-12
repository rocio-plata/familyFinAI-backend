# Pendientes del proyecto

Este documento reúne el trabajo pendiente identificado en los contextos implementados y en la
infraestructura transversal. `AI Assistance` queda fuera de este inventario.

## Budgeting

- Definir y publicar el evento `BudgetOverspent` cuando un status mensual cruce el límite.
- Decidir si cualquier `Member` puede gestionar presupuestos o si las operaciones requieren rol
  `Owner`.
- Evaluar mover `Money` a `shared-kernel` para evitar que Budgeting dependa del dominio interno de
  Financial Tracking.
- Añadir integración end-to-end: crear un movimiento por HTTP y verificar que actualiza
  `BudgetPeriodStatus` a través del `EventBus`.

## Family & Access

- Implementar notificaciones reales por email para las invitaciones; actualmente están fuera del
  alcance funcional inmediato.
- Evaluar permisos más granulares para `InviteMember` y `RemoveMember`.
- Revisar y estabilizar los DTOs HTTP de consultas como `GetFamilyMembers` según las necesidades de
  la app móvil.

## Financial Tracking

- Mantener documentada la decisión actual de permisos: las operaciones sobre movimientos requieren
  membresía, pero no un rol `Owner`; revisar si el producto necesita permisos más granulares.
- Añadir pruebas de integración contra PostgreSQL para repositorios y migraciones.

## Reporting

- Mantener la decisión de no hacer backfill histórico: después de un reset, el read model comienza
  vacío y solo se alimenta con eventos nuevos.
- Evaluar como mejora opcional simplificar `CategoryPeriodAggregate` a un único total si el modelo
  tipado por categoría lo hace conveniente.
- Añadir pruebas end-to-end que cubran crear, actualizar, reclasificar y borrar un movimiento y
  verifiquen el read model de Reporting.

## Persistencia y plataforma

- Implementar un `UnitOfWork` completo para operaciones que modifican varios agregados dentro de
  una misma transacción.
- Definir y ejecutar una estrategia de pruebas de integración contra PostgreSQL en CI o mediante
  una base de datos local de test.
- Verificar de forma automatizada `db:reset`, `db:migrate` y la migración inicial desde una base
  vacía.
- Revisar índices adicionales usando métricas reales de consultas.
- Evaluar la estrategia de pool de conexiones si el despliegue final es serverless.

## Criterio de cierre

Un punto se considera resuelto cuando su implementación, pruebas y documentación reflejan el
comportamiento real del sistema.
