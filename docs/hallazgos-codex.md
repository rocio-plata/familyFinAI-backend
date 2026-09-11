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
2. Definir el contrato HTTP antes de implementar: método, URL, parámetros, query string, body, autenticación, respuestas exitosas y errores.
3. Escribir primero los tests HTTP que fallan. Si se agregan reglas de negocio, escribir también los tests unitarios del dominio o caso de uso.
4. Crear o reutilizar el caso de uso o query y sus puertos, Value Objects y errores de dominio, sin incorporar Fastify al dominio ni a la aplicación.
5. En la ruta `<recurso>.routes.ts`, declarar schemas de Fastify para cada entrada HTTP que corresponda (`params`, `querystring` y/o `body`). El schema debe expresar campos requeridos, tipos y límites básicos como `minLength`.
6. Conservar la coerción de tipos predeterminada de Fastify. Los valores compatibles pueden convertirse al tipo declarado por el schema; el contrato y sus pruebas deben documentar ese comportamiento. Por ejemplo, `name: 123` se convierte en `"123"` para un campo `string`.
7. Dejar el handler delgado: tomar los datos ya validados, llamar al caso de uso y serializar la respuesta. No crear `DomainError` anónimos para errores de formato del request.
8. Los errores de schema son tratados por `registerErrorHandler` y deben responder `400` con `{ error: "HTTP.INVALID_REQUEST_BODY", message }`. Los errores de dominio continúan usando su código y el status resuelto por `resolveHttpStatus`.
9. Si el recurso pertenece a una familia, encadenar `authenticate` y `requireFamilyMembership`, usando `request.familyContext`.
10. Registrar dependencias y rutas en `src/platform/app.ts`.
11. Probar el contrato completo con `app.inject`: éxito, falta de autenticación cuando aplique, entradas inválidas y cuerpo de error; incluir casos de coerción admitida cuando formen parte del contrato.
12. Ejecutar `npm test`, `npm run build` y `npm run lint`; corregir cualquier fallo antes de entregar.

## 4. Inconsistencias detectadas

- **Resuelto:** `CreateFinancialItemUseCase` ahora persiste el ítem mediante `itemRepository.save` antes de extraer y publicar sus eventos. Una prueba de regresión verifica el orden `persist → publish`.
- Hay un query bajo `src/contexts/family-access/application/commands/get-family-membership.query.ts`, duplicado además en la carpeta correcta `application/queries/`. Esto contradice la separación de commands y queries.
- La guía indica preferir `type` salvo que se necesite `implements`, pero varios DTOs y comandos usan `interface` sin esa necesidad, por ejemplo `CreateFamilyCommand`.
- **Resuelto:** los 132 archivos TypeScript bajo `src/` ahora comienzan con un comentario uniforme que identifica su ruta, con el formato `// /src/ruta/al/archivo.ts`.
- **Resuelto:** `POST /families` valida el body mediante el schema de Fastify, por lo que ya no declara un `DomainError` anónimo en la ruta. El manejador global transforma los errores de validación HTTP en una respuesta `400` con el código `HTTP.INVALID_REQUEST_BODY`.
- **Resuelto:** este hallazgo describía un estado anterior. Reporting ya cuenta con persistencia InMemory y Drizzle, composición, suscripciones al `EventBus` y endpoints HTTP; `src/platform/server.ts` selecciona InMemory o PostgreSQL mediante `PERSISTENCE_MODE`.
- La documentación menciona `financial-item.routes.ts` como ejemplo de middleware, pero ese archivo no existe actualmente.
