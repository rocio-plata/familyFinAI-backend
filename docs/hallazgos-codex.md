# Hallazgos de Codex

Este documento registra la inspección del repositorio realizada sin modificar el código existente.

## 1. Reglas de arquitectura identificadas

- El proyecto aplica DDD y arquitectura hexagonal: el dominio queda aislado, la capa de aplicación orquesta casos de uso y la infraestructura adapta HTTP, persistencia y proveedores externos.
- Los bounded contexts definidos son Family & Access, Financial Tracking, Budgeting, Reporting & Analytics y AI Assistance. Family & Access es upstream y Financial Tracking es el dominio central.
- El dominio usa entidades o agregados, Value Objects inmutables, errores de dominio y repositorios como puertos.
- Los casos de uso escriben o consultan mediante repositorios y publican eventos de dominio.
- Los contextos se comunican de forma síncrona mediante casos de uso públicos o asíncrona mediante `EventBus`. Financial Tracking solo publica eventos; no se suscribe a ellos.
- Los handlers HTTP deben ser delgados: reciben la solicitud, llaman a un caso de uso y serializan la respuesta. La lógica de negocio no debe vivir en Fastify.
- Las rutas que operan con datos de una familia deben ejecutar `authenticate` y `requireFamilyMembership`.
- Las pruebas usan `node:test`, dobles explícitos y TDD. El proyecto usa TypeScript ESM e imports internos con extensión `.js`.

## 2. Endpoint de referencia

El endpoint de negocio HTTP disponible es `POST /families`, implementado en `src/contexts/family-access/infrastructure/http/family.routes.ts` y probado en `tests/contexts/family-access/http/create-family.route.test.ts`.

Es una referencia para registrar rutas por contexto, inyectar middleware y casos de uso, obtener `request.userId`, delegar al caso de uso, responder con `201` y probar mediante `app.inject`.

No existe todavía una ruta que implemente la cadena completa `authenticate` + `requireFamilyMembership`. Para un recurso bajo `/families/:familyId/...`, se debe extender este patrón añadiendo ambos middlewares.

## 3. Pasos para implementar un endpoint nuevo

1. Antes de escribir código, solicitar el nombre de la rama y crearla.
2. Definir el comportamiento y escribir primero el test HTTP que falla; si hay reglas nuevas de dominio, escribir también sus pruebas unitarias.
3. Crear o reutilizar el caso de uso o query y sus puertos, Value Objects y errores de dominio, sin incorporar Fastify al dominio ni a la aplicación.
4. Implementar la ruta `<recurso>.routes.ts` con parsing mínimo, llamada al caso de uso, serialización y código HTTP.
5. Si el recurso pertenece a una familia, encadenar `authenticate` y `requireFamilyMembership`, usando `request.familyContext`.
6. Registrar dependencias y rutas en `src/platform/app.ts`.
7. Ejecutar `npm test`, `npm run build` y `npm run lint`; corregir cualquier fallo antes de entregar.

## 4. Inconsistencias detectadas

- `AGENTS.md` prescribe persistir un agregado y publicar sus eventos después. Sin embargo, `CreateFinancialItemUseCase` publica los eventos antes de ejecutar `itemRepository.save`, por lo que otros contextos podrían reaccionar a un ítem no persistido.
- Hay un query bajo `src/contexts/family-access/application/commands/get-family-membership.query.ts`, duplicado además en la carpeta correcta `application/queries/`. Esto contradice la separación de commands y queries.
- La guía indica preferir `type` salvo que se necesite `implements`, pero varios DTOs y comandos usan `interface` sin esa necesidad, por ejemplo `CreateFamilyCommand`.
- El formato del primer comentario de los archivos no es uniforme respecto de la norma: muchos omiten el prefijo `src/` y alguno tiene una ruta que no corresponde al archivo, como el comentario de `src/shared-kernel/domain/currency.ts`.
- `POST /families` declara un `DomainError` anónimo para un body inválido. La guía pide errores específicos y ubicados en `domain/errors`.
- La arquitectura documenta Budgeting, Reporting, AI Assistance, adaptadores Drizzle y `platform/db`, pero el repositorio solo materializa Family Access y Financial Tracking. El servidor usa `InMemoryFamilyRepository`, no PostgreSQL/Neon; parece un avance parcial, también descrito como pendiente en la documentación.
- La documentación menciona `financial-item.routes.ts` como ejemplo de middleware, pero ese archivo no existe actualmente.
