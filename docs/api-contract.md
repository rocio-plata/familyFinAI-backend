# Contrato de API REST — FamilyFin AI (v2, estado actual)

> **Estado del documento**
> - Las secciones 1 a 5 provienen de la lectura del código del backend por otro agente de IA y **sustituyen a mi versión v1**, que se basaba en Postman y en el plan de endpoints y daba por pendientes rutas que ya existen (Budgeting, Reporting y AI Assistance están expuestos).
> - Las secciones 6 a 9 son nuevas: **brechas entre este contrato y lo que necesita la app móvil**, **discrepancias** (incluida la colección Postman), un **mapa pantalla → endpoints** y los **códigos de error que faltan**.
> - La serialización `Money`, la validación de importes enteros y los errores 401/403 tipados están implementados. También están implementados el bloqueo de cambio de moneda por actividad financiera, `GET /families/:familyId/settings` y la validación de moneda en items y presupuestos. Las reglas de confirmación de IA y demás brechas siguen siendo propuestas hasta su implementación.

Este documento constituye el contrato de interfaz oficial entre el backend de **FamilyFin AI** y el cliente móvil Kotlin (Android). Define las convenciones globales, mecanismos de autenticación y autorización, estructuras de datos, códigos de error y la especificación detallada de cada endpoint disponible.

La version machine-readable del contrato esta en [docs/openapi.yaml](openapi.yaml), siguiendo OpenAPI 3.1. Puede abrirse con Swagger UI o Redoc para generar documentacion interactiva.

Swagger UI local se habilita de forma opt-in con `ENABLE_LOCAL_SWAGGER=true npm run dev` y queda disponible en `http://localhost:3000/docs`. No se registra cuando `NODE_ENV=production`, incluso si la bandera esta definida.

---

## 1. Convenciones Generales

| Propiedad | Especificación |
|---|---|
| Protocolo | HTTPS / HTTP 1.1 |
| Formato de intercambio | `application/json; charset=utf-8` (salvo subida de archivos vía `multipart/form-data`) |
| Nomenclatura de claves | `camelCase` en solicitudes y respuestas |
| Formato de fechas y horas | ISO 8601 UTC extendido (`YYYY-MM-DDTHH:mm:ss.sssZ`) o fecha (`YYYY-MM-DD`) |
| Formato de periodos mensuales | `YYYY-MM` (expresión regular `^[0-9]{4}-(0[1-9]\|1[0-2])$`) |
| Identificadores (`id`) | UUID v4 en formato string |
| Monedas soportadas | `"CLP"`, `"USD"`, `"EUR"`. Por defecto familiar: `"CLP"`. |
| Dinero (Fase 0, decisiones D1 y D9) | **Entero en la unidad menor de la moneda** en peticiones y respuestas. Las respuestas lo devuelven como objeto `Money`: `{ "amount": 1599, "currency": "USD" }` = US$ 15,99. Exponentes: `CLP` 0, `USD` 2, `EUR` 2. El cliente convierte con `Currency.getDefaultFractionDigits()` y **nunca usa `Double`** |
| Moneda de la familia (Fase 1 parcial, decisión D2) | Items y presupuestos deben usar la moneda familiar (`SHARED.CURRENCY_MISMATCH`, 409). Cambiarla está bloqueado si existen items o presupuestos activos (`FAMILY.CURRENCY_LOCKED`, 409). `GET /families/:familyId/settings` expone el estado de bloqueo. La confirmación de sugerencias aún queda pendiente |
| Filosofía IA | **"La IA propone, el usuario confirma"**: la IA nunca escribe directo en el core financiero; genera sugerencias que el usuario debe confirmar o descartar. |

### 1.1 Formato Estándar de Errores

Todas las respuestas de error (`4xx` y `5xx`) retornan una carga útil JSON con la siguiente estructura:

```json
{
  "error": "STRING_IDENTIFICADOR_DEL_ERROR",
  "message": "Descripción legible en español del problema",
  "details": {}
}
```

`details` es opcional y solo aparece cuando el error aporta datos estructurados.

- **Errores de validación de esquema (HTTP 400)**: Código `"HTTP.INVALID_REQUEST_BODY"` cuando el JSON recibido no cumple con las restricciones de tipo, campos obligatorios o formatos declarados en Fastify.
- **Errores de autenticación (HTTP 401)**: `AUTH.MISSING_TOKEN` o `AUTH.INVALID_TOKEN`.
- **Errores de autorización (HTTP 403)**: `FAMILY.NOT_A_MEMBER` o `FAMILY.INSUFFICIENT_ROLE`.
- **Errores de dominio (`DomainError`)**: Códigos con prefijo o sufijo semántico (e.g. `CATEGORY_NOT_FOUND`, `DUPLICATE_CATEGORY_NAME`, `IDENTITY.INVALID_CREDENTIALS`).
- **Errores inesperados (HTTP 500)**: `{ "error": "INTERNAL.UNEXPECTED_ERROR", "message": "Something went wrong" }`.

---

## 2. Autenticación y Autorización

### 2.1 Tokens de Acceso y Refresco
- **Access Token**: JWT firmado simétricamente con `HS256`, contiene en el `sub` el `userId`. Debe enviarse en el header HTTP:
  ```http
  Authorization: Bearer <accessToken>
  ```
- **Refresh Token**: Token opaco (UUID) almacenado en servidor.
  - Se utiliza llamando a `POST /auth/refresh`.
  - **Rotación estricta**: cada refresco invalida el token actual y emite un nuevo par de tokens (`accessToken` y `refreshToken`).
  - **Detección de reuso / posible robo**: si se presenta un refresh token ya revocado o usado previamente, se invalidan de inmediato todas las sesiones del usuario y responde `401 Unauthorized` con código `AUTH.POSSIBLE_TOKEN_THEFT`.

### 2.2 Roles en la Familia
- `OWNER`: Administrador de la familia. Puede invitar miembros, remover miembros, cambiar roles, modificar la moneda por defecto, gestionar categorías y tags.
- `MEMBER`: Miembro de la familia. Puede registrar y consultar movimientos, crear medios de pago, definir su medio de pago predeterminado, gestionar presupuestos, consultar reportes e interactuar con el asistente de IA.

---

## 3. Catálogo de Endpoints

Las rutas de invitaciones implementadas incluyen `GET /me/invitations`,
`POST /invitations/:invitationId/decline` y `GET /families/:familyId/invitations`. El listado
administrativo requiere rol `OWNER`; el listado propio deriva el email desde el usuario autenticado
y nunca lo recibe por querystring.

Los períodos de Reporting y Budgeting se resuelven en la zona `REPORTING_TIMEZONE`, cuyo valor
predeterminado es `America/Santiago`. La consulta `trend` admite como máximo 24 meses.

La confirmación de sugerencias IA responde `201 Created` con el movimiento financiero creado. El
texto de entrada acepta entre 1 y 500 caracteres y una confirmación sin categoría devuelve
`AI.CATEGORY_REQUIRED`.

`GET /families/:familyId/suggestions` devuelve únicamente las sugerencias `PENDING` del usuario
autenticado dentro de la familia indicada.

Las sugerencias incluyen `expiresAt` y caducan 24 horas después de su creación. Confirmar o
descartar una sugerencia vencida devuelve `AI.SUGGESTION_EXPIRED`.

`GET /families/:familyId/ai-usage` devuelve `{ limit, used, remaining, resetsAt }`. El límite
diario predeterminado es 30 sugerencias por usuario y se reinicia según `AI_USAGE_TIMEZONE`.
Los recibos multipart deben usar el campo `file`, pesar como máximo 10 MB y contener JPEG, PNG o
WebP válidos según su firma de bytes.

### 3.1 Salud del Sistema

#### `GET /health`
Verifica el estado del servicio y su disponibilidad.
- **Autenticación**: Pública (no requiere token).
- **Respuesta `200 OK`**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-12T14:30:00.000Z"
  }
  ```

---

### 3.2 Identidad y Sesión (`Identity` & `Platform Auth`)

#### `POST /auth/register`
Registra un nuevo usuario en la plataforma. De forma automática y atómica, crea su familia personal ("Familia de <displayName>"), le asigna el rol `OWNER` y le emite su primer par de tokens de autenticación.
- **Autenticación**: Pública.
- **Request Body**:
  | Campo | Tipo | Requerido | Restricciones |
  |---|---|---|---|
  | `email` | string | Sí | Formato de correo válido (`^[^\s@]+@[^\s@]+\.[^\s@]+$`), case-insensitive |
  | `password` | string | Sí | Mínimo 8 caracteres |
  | `displayName` | string | Sí | 1 a 60 caracteres |
- **Respuesta `201 Created`**:
  ```json
  {
    "userId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "email": "usuario@example.com",
    "displayName": "Rocío Gómez",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "e3a89012-70b1-4f10-9b30-c32f8b502019",
    "defaultFamilyId": "b1b2b3b4-1111-4222-8333-a1b2c3d4e5f6"
  }
  ```
- **Errores posibles**:
  - `400`: `IDENTITY.WEAK_PASSWORD`, `IDENTITY.INVALID_DISPLAY_NAME`, `SHARED.INVALID_EMAIL`.
  - `409`: `IDENTITY.EMAIL_ALREADY_REGISTERED`.

---

#### `POST /auth/login`
Inicia sesión con credenciales de correo y contraseña.
- **Autenticación**: Pública.
- **Request Body**:
  | Campo | Tipo | Requerido |
  |---|---|---|
  | `email` | string | Sí |
  | `password` | string | Sí |
- **Respuesta `200 OK`**:
  ```json
  {
    "userId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "email": "usuario@example.com",
    "displayName": "Rocío Gómez",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "e3a89012-70b1-4f10-9b30-c32f8b502019"
  }
  ```
- **Errores posibles**:
  - `401`: `IDENTITY.INVALID_CREDENTIALS` (credenciales erróneas o usuario no existe).

---

#### `POST /auth/refresh`
Renueva el par de tokens de autenticación mediante el refresh token.
- **Autenticación**: Pública (el refresh token es la credencial).
- **Request Body**:
  | Campo | Tipo | Requerido |
  |---|---|---|
  | `refreshToken` | string | Sí (UUID del token) |
- **Respuesta `200 OK`**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "f4b90123-81c2-4a21-ac41-d4309c613120"
  }
  ```
- **Errores posibles**:
  - `401`: `AUTH.INVALID_REFRESH_TOKEN` (token inexistente o expirado).
  - `401`: `AUTH.POSSIBLE_TOKEN_THEFT` (token previamente revocado; todas las sesiones del usuario han sido revocadas).

---

#### `POST /auth/logout`
Revoca todos los refresh tokens activos del usuario autenticado, cerrando todas sus sesiones abiertas.
- **Autenticación**: Bearer Token.
- **Respuesta `204 No Content`**

---

#### `GET /me/profile`
Obtiene el perfil del usuario autenticado.
- **Autenticación**: Bearer Token.
- **Respuesta `200 OK`**:
  ```json
  {
    "userId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "email": "usuario@example.com",
    "displayName": "Rocío Gómez",
    "createdAt": "2026-03-01T10:00:00.000Z"
  }
  ```

---

#### `PATCH /me/display-name`
Actualiza el nombre visible del usuario.
- **Autenticación**: Bearer Token.
- **Request Body**:
  | Campo | Tipo | Requerido | Restricciones |
  |---|---|---|---|
  | `displayName` | string | Sí | 1 a 60 caracteres |
- **Respuesta `200 OK`**:
  ```json
  {
    "displayName": "Rocío Gómez Silva"
  }
  ```
- **Errores posibles**:
  - `400`: `IDENTITY.INVALID_DISPLAY_NAME`.

---

#### `PATCH /me/password`
Cambia la contraseña del usuario previa verificación de la contraseña actual.
- **Autenticación**: Bearer Token.
- **Request Body**:
  | Campo | Tipo | Requerido | Restricciones |
  |---|---|---|---|
  | `currentPassword` | string | Sí | Contraseña actual |
  | `newPassword` | string | Sí | Nueva contraseña (mínimo 8 caracteres) |
- **Respuesta `204 No Content`**
- **Errores posibles**:
  - `401`: `IDENTITY.INVALID_CREDENTIALS` (la contraseña actual no coincide).
  - `400`: `IDENTITY.WEAK_PASSWORD` (la nueva contraseña no cumple el mínimo de longitud).

---

### 3.3 Gestión Familiar (`Family & Access`)

#### `POST /families`
Crea una nueva familia. El usuario creador queda automáticamente asignado con rol `OWNER`.
- **Autenticación**: Bearer Token.
- **Request Body**:
  | Campo | Tipo | Requerido | Restricciones |
  |---|---|---|---|
  | `name` | string | Sí | 1 a 60 caracteres |
- **Respuesta `201 Created`**:
  ```json
  {
    "id": "b1b2b3b4-1111-4222-8333-a1b2c3d4e5f6",
    "name": "Familia Gómez",
    "defaultCurrency": "CLP"
  }
  ```
- **Errores posibles**:
  - `400`: `FAMILY.INVALID_FAMILY_NAME`.

---

#### `GET /me/families`
Retorna el listado de familias a las que pertenece el usuario autenticado, respetando el orden de preferencia definido por el usuario.
- **Autenticación**: Bearer Token.
- **Respuesta `200 OK`**:
  ```json
  [
    {
      "familyId": "b1b2b3b4-1111-4222-8333-a1b2c3d4e5f6",
      "name": "Familia Gómez",
      "role": "OWNER",
      "defaultCurrency": "CLP",
      "memberCount": 3
    },
    {
      "familyId": "c2c3c4c5-2222-4333-9444-b2c3d4e5f6a7",
      "name": "Departamento Compartido",
      "role": "MEMBER"
    }
  ]
  ```

---

#### `PUT /me/families/order`
Actualiza el orden de visualización de las familias del usuario. La lista provista debe contener exactamente los mismos IDs de todas las familias a las que pertenece el usuario.
- **Autenticación**: Bearer Token.
- **Request Body**:
  ```json
  {
    "orderedFamilyIds": [
      "c2c3c4c5-2222-4333-9444-b2c3d4e5f6a7",
      "b1b2b3b4-1111-4222-8333-a1b2c3d4e5f6"
    ]
  }
  ```
- **Respuesta `204 No Content`**
- **Errores posibles**:
  - `400`: `FAMILY.INVALID_FAMILY_ORDER` (faltan IDs o contiene IDs a los que no pertenece).

---

#### `GET /families/:familyId/members`
Lista todos los miembros actuales de la familia indicada.
- **Autenticación**: Bearer Token + Miembro de la familia (`OWNER` o `MEMBER`).
- **Respuesta `200 OK`**:
  ```json
  [
    {
      "userId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
      "role": "OWNER",
      "displayName": "Rocío Gómez",
      "email": "rocio@example.com",
      "joinedAt": "2026-03-01T10:00:00.000Z"
    },
    {
      "userId": "a1a2a3a4-5555-4666-8777-123456789abc",
      "role": "MEMBER",
      "joinedAt": "2026-03-05T15:20:00.000Z"
    }
  ]
  ```

---

#### `GET /families/:familyId/members/me`
Obtiene los datos de membresía del usuario actual en la familia indicada.
- **Autenticación**: Bearer Token + Miembro de la familia.
- **Respuesta `200 OK`**:
  ```json
  {
    "familyId": "b1b2b3b4-1111-4222-8333-a1b2c3d4e5f6",
    "userId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "role": "OWNER",
    "joinedAt": "2026-03-01T10:00:00.000Z"
  }
  ```

---

#### `POST /families/:familyId/invitations`
Crea una invitación para que otro usuario se sume a la familia.
- **Autenticación**: Bearer Token + Rol `OWNER`.
- **Request Body**:
  | Campo | Tipo | Requerido | Valores permitidos |
  |---|---|---|---|
  | `email` | string | Sí | Email del invitado |
  | `role` | string | Sí | `"OWNER"` \| `"MEMBER"` |
- **Respuesta `201 Created`**:
  ```json
  {
    "id": "e5e6e7e8-9999-4000-8111-abcdefabcdef",
    "familyId": "b1b2b3b4-1111-4222-8333-a1b2c3d4e5f6",
    "invitedEmail": "hermano@example.com",
    "role": "MEMBER",
    "status": "PENDING",
    "expiresAt": "2026-10-19T14:30:00.000Z"
  }
  ```
- **Errores posibles**:
  - `403`: `FAMILY.INSUFFICIENT_ROLE` (si quien invita no es OWNER).
  - `409`: `FAMILY.ALREADY_MEMBER` (el usuario invitado ya es miembro de la familia).

---

#### `POST /invitations/:invitationId/accept`
Acepta una invitación pendiente. El email del usuario autenticado debe coincidir con el `invitedEmail` de la invitación.
- **Autenticación**: Bearer Token.
- **Respuesta `204 No Content`**
- **Errores posibles**:
  - `404`: `FAMILY.INVITATION_NOT_FOUND`.
  - `400`: `FAMILY.INVITATION_EXPIRED`, `FAMILY.INVITATION_NOT_PENDING`.
  - `403`: Si el usuario autenticado tiene un email distinto al invitado.

---

#### `DELETE /invitations/:invitationId`
Revoca una invitación pendiente.
- **Autenticación**: Bearer Token (creador de la invitación o administrador).
- **Respuesta `204 No Content`**
- **Errores posibles**:
  - `404`: `FAMILY.INVITATION_NOT_FOUND`.
  - `400`: `FAMILY.INVITATION_NOT_PENDING`.

---

#### `DELETE /families/:familyId/members/:memberId`
Remueve a un miembro de la familia.
- **Autenticación**: Bearer Token + Rol `OWNER`.
- **Respuesta `204 No Content`**
- **Errores posibles**:
  - `400`: `FAMILY.CANNOT_REMOVE_LAST_OWNER` (no se puede expulsar o remover al único OWNER existente).
  - `404`: `FAMILY.MEMBER_NOT_FOUND`.

---

#### `PATCH /families/:familyId/members/:memberId/role`
Modifica el rol de un miembro de la familia.
- **Autenticación**: Bearer Token + Rol `OWNER`.
- **Request Body**:
  | Campo | Tipo | Requerido | Valores permitidos |
  |---|---|---|---|
  | `newRole` | string | Sí | `"OWNER"` \| `"MEMBER"` |
- **Respuesta `204 No Content`**
- **Errores posibles**:
  - `400`: `FAMILY.CANNOT_REMOVE_LAST_OWNER` (no se puede degradar a MEMBER si es el único OWNER).
  - `404`: `FAMILY.MEMBER_NOT_FOUND`.

---

#### `PATCH /families/:familyId/settings/currency`
Modifica la moneda predeterminada de la familia.
- **Autenticación**: Bearer Token + Rol `OWNER`.
- **Request Body**:
  | Campo | Tipo | Requerido | Valores permitidos |
  |---|---|---|---|
  | `newCurrency` | string | Sí | `"CLP"`, `"USD"`, `"EUR"` |
- **Respuesta `204 No Content`**
- **Errores posibles**:
  - `400`: `SHARED.UNSUPPORTED_CURRENCY`.

---

### 3.4 Seguimiento Financiero (`Financial Tracking`)

#### 3.4.1 Medios de Pago (`Payment Methods`)

#### `POST /families/:familyId/payment-methods`
Crea un nuevo medio de pago (ej. "Efectivo", "Tarjeta Santander", "Cuenta Corriente").
- **Autenticación**: Bearer Token + Miembro.
- **Request Body**:
  | Campo | Tipo | Requerido | Restricciones |
  |---|---|---|---|
  | `name` | string | Sí | 1 a 40 caracteres |
- **Respuesta `201 Created`**:
  ```json
  {
    "id": "m1m2m3m4-0000-4111-8222-111122223333",
    "familyId": "b1b2b3b4-1111-4222-8333-a1b2c3d4e5f6",
    "name": "Tarjeta Santander",
    "status": "ACTIVE"
  }
  ```
- **Errores posibles**:
  - `409`: `FINANCIAL.DUPLICATE_PAYMENT_METHOD_NAME`.

---

#### `GET /families/:familyId/payment-methods`
Lista los medios de pago de la familia.
- **Autenticación**: Bearer Token + Miembro.
- **Query Params**:
  - `includeDeprecated` (boolean, opcional, default: `false`): Si es `true`, incluye medios de pago deprecados.
- **Respuesta `200 OK`**:
  ```json
  [
    {
      "id": "m1m2m3m4-0000-4111-8222-111122223333",
      "familyId": "b1b2b3b4-1111-4222-8333-a1b2c3d4e5f6",
      "name": "Tarjeta Santander",
      "status": "ACTIVE"
    }
  ]
  ```

---

#### `PATCH /families/:familyId/payment-methods/:paymentMethodId`
Renombra un medio de pago existente.
- **Autenticación**: Bearer Token + Miembro.
- **Request Body**: `{ "name": "Tarjeta Débito Santander" }`
- **Respuesta `200 OK`**: Retorna el objeto `PaymentMethod` actualizado.
- **Errores posibles**:
  - `404`: `FINANCIAL.PAYMENT_METHOD_NOT_FOUND`.
  - `409`: `FINANCIAL.DUPLICATE_PAYMENT_METHOD_NAME`.

---

#### `POST /families/:familyId/payment-methods/:paymentMethodId/deprecate`
Depreca un medio de pago para que no aparezca en nuevas selecciones, pero preserva el historial.
- **Autenticación**: Bearer Token + Miembro.
- **Respuesta `204 No Content`**
- **Errores posibles**:
  - `404`: `FINANCIAL.PAYMENT_METHOD_NOT_FOUND`.

---

#### `DELETE /families/:familyId/payment-methods/:paymentMethodId`
Elimina físicamente un medio de pago.
- **Autenticación**: Bearer Token + Miembro.
- **Respuesta `204 No Content`**
- **Errores posibles**:
  - `409`: `FINANCIAL.PAYMENT_METHOD_HAS_ASSOCIATED_ITEMS` (no se puede borrar si ya tiene movimientos registrados; debe deprecarse en su lugar).
  - `409`: `FINANCIAL.PAYMENT_METHOD_IS_SOMEONES_DEFAULT` (no se puede borrar si es el medio por defecto de algún miembro).

---

#### `PUT /families/:familyId/me/default-payment-method`
Establece el medio de pago preferido para el usuario autenticado en la familia. Se usará automáticamente al registrar transacciones si no se indica otro.
- **Autenticación**: Bearer Token + Miembro.
- **Request Body**:
  | Campo | Tipo | Requerido |
  |---|---|---|
  | `paymentMethodId` | string (UUID) | Sí |
- **Respuesta `204 No Content`**
- **Errores posibles**:
  - `404`: `FINANCIAL.PAYMENT_METHOD_NOT_FOUND`.
  - `400`: `FINANCIAL.PAYMENT_METHOD_NOT_ACTIVE`.

---

#### 3.4.2 Categorías y Tags

#### `POST /families/:familyId/categories`
Crea una nueva categoría de gastos o ingresos.
- **Autenticación**: Bearer Token + Rol `OWNER`.
- **Request Body**:
  | Campo | Tipo | Requerido | Restricciones |
  |---|---|---|---|
  | `type` | string | Sí | `"EXPENSE"` \| `"INCOME"` |
  | `name` | string | Sí | 1 a 50 caracteres |
  | `icon` | string | No | 1 a 40 caracteres (clave del catálogo de íconos en la app) |
- **Respuesta `201 Created`**:
  ```json
  {
    "id": "c1c2c3c4-0000-4111-8222-abcdefabcdef",
    "type": "EXPENSE",
    "name": "Alimentación",
    "icon": "shopping_cart",
    "status": "ACTIVE"
  }
  ```
- **Errores posibles**:
  - `403`: `FINANCIAL.INSUFFICIENT_ROLE` (si no es OWNER).
  - `409`: `FINANCIAL.DUPLICATE_CATEGORY_NAME` (no pueden existir dos categorías activas o deprecadas del mismo tipo con el mismo nombre).

---

#### `GET /families/:familyId/categories`
Obtiene las categorías de la familia junto con sus tags anidados.
- **Autenticación**: Bearer Token + Miembro.
- **Query Params**:
  - `type` (opcional): `"EXPENSE"` \| `"INCOME"`
  - `includeDeprecated` (boolean, opcional, default: `false`)
- **Respuesta `200 OK`**:
  ```json
  [
    {
      "id": "c1c2c3c4-0000-4111-8222-abcdefabcdef",
      "type": "EXPENSE",
      "name": "Alimentación",
      "icon": "shopping_cart",
      "status": "ACTIVE",
      "tags": [
        {
          "id": "t1t2t3t4-0000-4111-8222-123456789abc",
          "name": "Supermercado",
          "status": "ACTIVE",
          "displayOrder": 0
        },
        {
          "id": "t2t3t4t5-0000-4111-8222-123456789abd",
          "name": "Restaurantes",
          "status": "ACTIVE",
          "displayOrder": 1
        }
      ]
    }
  ]
  ```

---

#### `PATCH /families/:familyId/categories/:categoryId`
Actualiza el nombre y/o ícono de una categoría.
- **Autenticación**: Bearer Token + Rol `OWNER`.
- **Request Body** (al menos uno requerido):
  ```json
  {
    "newName": "Alimentación & Bebidas",
    "newIcon": "restaurant" // o null para remover el ícono
  }
  ```
- **Respuesta `200 OK`**:
  ```json
  {
    "id": "c1c2c3c4-0000-4111-8222-abcdefabcdef",
    "name": "Alimentación & Bebidas",
    "icon": "restaurant",
    "status": "ACTIVE"
  }
  ```
- **Errores posibles**:
  - `404`: `FINANCIAL.CATEGORY_NOT_FOUND`.
  - `409`: `FINANCIAL.DUPLICATE_CATEGORY_NAME`.

---

#### `POST /families/:familyId/categories/:categoryId/deprecate`
Marca una categoría como deprecada. Deja de aparecer en nuevas opciones de registro.
- **Autenticación**: Bearer Token + Rol `OWNER`.
- **Respuesta `204 No Content`**

---

#### `DELETE /families/:familyId/categories/:categoryId`
Elimina físicamente una categoría.
- **Autenticación**: Bearer Token + Rol `OWNER`.
- **Respuesta `204 No Content`**
- **Errores posibles**:
  - `409`: `FINANCIAL.CATEGORY_HAS_ASSOCIATED_ITEMS` (si tiene transacciones asociadas no puede borrarse; use deprecate).

---

#### `POST /families/:familyId/categories/:categoryId/tags`
Agrega un sub-tag a la categoría especificada.
- **Autenticación**: Bearer Token + Rol `OWNER`.
- **Request Body**:
  | Campo | Tipo | Requerido | Restricciones |
  |---|---|---|---|
  | `name` | string | Sí | 1 a 30 caracteres |
- **Respuesta `201 Created`**:
  ```json
  {
    "id": "t3t4t5t6-0000-4111-8222-123456789abe",
    "name": "Feria libre",
    "status": "ACTIVE",
    "displayOrder": 2
  }
  ```
- **Errores posibles**:
  - `400`: `FINANCIAL.CATEGORY_NOT_ACTIVE`.
  - `409`: `FINANCIAL.DUPLICATE_TAG_NAME`.

---

#### `PATCH /families/:familyId/categories/:categoryId/tags/:tagId`
Renombra un tag de la categoría.
- **Autenticación**: Bearer Token + Rol `OWNER`.
- **Request Body**: `{ "name": "Feria de Verduras" }`
- **Respuesta `200 OK`**: Retorna el objeto `Tag` actualizado.

---

#### `PUT /families/:familyId/categories/:categoryId/tags/order`
Reordena los tags de una categoría según la preferencia visual deseada.
- **Autenticación**: Bearer Token + Rol `OWNER`.
- **Request Body**:
  ```json
  {
    "orderedTagIds": [
      "t2t3t4t5-0000-4111-8222-123456789abd",
      "t1t2t3t4-0000-4111-8222-123456789abc"
    ]
  }
  ```
- **Respuesta `204 No Content`**

---

#### `POST /families/:familyId/categories/:categoryId/tags/:tagId/deprecate`
Depreca un tag de la categoría.
- **Autenticación**: Bearer Token + Rol `OWNER`.
- **Respuesta `204 No Content`**

---

#### `DELETE /families/:familyId/categories/:categoryId/tags/:tagId`
Elimina físicamente un tag. Falla si ya tiene movimientos asociados.
- **Autenticación**: Bearer Token + Rol `OWNER`.
- **Respuesta `204 No Content`**
- **Errores posibles**:
  - `409`: `FINANCIAL.TAG_HAS_ASSOCIATED_ITEMS`.

---

#### 3.4.3 Movimientos Financieros (`Financial Items`)

#### `POST /families/:familyId/items`
Registra un nuevo movimiento financiero (gasto o ingreso según la categoría).
- **Autenticación**: Bearer Token + Miembro.
- **Request Body**:
  | Campo | Tipo | Requerido | Descripción / Reglas |
  |---|---|---|---|
  | `amount` | integer | Sí | Monto entero mayor que 0 en unidades menores |
  | `currency` | string | No | `"CLP"`, `"USD"`, `"EUR"`. Si no se envía, usa la moneda por defecto de la familia. |
  | `categoryId` | string (UUID) | Sí | Debe ser una categoría activa de la familia. |
  | `paymentMethodId` | string (UUID) | No | Si se omite, se utiliza el default payment method configurado por el usuario. Si no tiene uno configurado, arroja error. |
  | `tagId` | string (UUID) | No | Debe pertenecer a la categoría especificada. |
  | `title` | string | Sí | 1 a 100 caracteres. |
  | `note` | string | No | Hasta 500 caracteres (observaciones). |
  | `occurredOn` | string (ISO 8601) | Sí | Fecha/hora de la transacción. **No puede ser una fecha futura**. |
- **Respuesta `201 Created`**:
  ```json
  {
    "id": "i1i2i3i4-0000-4111-8222-111122223333",
    "type": "EXPENSE",
    "amount": { "amount": 25990, "currency": "CLP" },
    "categoryId": "c1c2c3c4-0000-4111-8222-abcdefabcdef",
    "tagId": "t1t2t3t4-0000-4111-8222-123456789abc",
    "paymentMethodId": "m1m2m3m4-0000-4111-8222-111122223333",
    "title": "Supermercado Lider",
    "note": "Compra semanal de despensa",
    "occurredOn": "2026-10-12T12:00:00.000Z"
  }
  ```
- **Errores posibles**:
  - `400`: `FINANCIAL.NO_DEFAULT_PAYMENT_METHOD_SET` (si no se proveyó `paymentMethodId` y el usuario no tiene default configurado).
  - `400`: `FINANCIAL.FUTURE_TRANSACTION_DATE` (la fecha es futura).
  - `400`: `FINANCIAL.CATEGORY_NOT_ACTIVE`.
  - `400`: `FINANCIAL.TAG_DOES_NOT_BELONG_TO_CATEGORY`.
  - `404`: `FINANCIAL.CATEGORY_NOT_FOUND`, `FINANCIAL.PAYMENT_METHOD_NOT_FOUND`.

---

#### `GET /families/:familyId/items`
Consulta los movimientos registrados con filtros opcionales.
- **Autenticación**: Bearer Token + Miembro.
- **Query Params**:
  - `from` (string ISO date o date-time): Fecha inicial del periodo (debe enviarse junto con `to`).
  - `to` (string ISO date o date-time): Fecha final del periodo (debe enviarse junto con `from`).
  - `categoryId` (UUID, opcional): Filtrar por categoría.
  - `tagId` (UUID, opcional): Filtrar por tag.
  - `type` (opcional): `"EXPENSE"` \| `"INCOME"`.
- **Respuesta `200 OK`**:
  ```json
  [
    {
      "id": "i1i2i3i4-0000-4111-8222-111122223333",
      "familyId": "b1b2b3b4-1111-4222-8333-a1b2c3d4e5f6",
      "recordedBy": "d290f1ee-6c54-4b01-90e6-d701748f0851",
      "type": "EXPENSE",
      "amount": { "amount": 25990, "currency": "CLP" },
      "categoryId": "c1c2c3c4-0000-4111-8222-abcdefabcdef",
      "tagId": "t1t2t3t4-0000-4111-8222-123456789abc",
      "title": "Supermercado Lider",
      "note": "Compra semanal de despensa",
      "occurredOn": "2026-10-12T12:00:00.000Z",
      "createdAt": "2026-10-12T12:05:00.000Z"
    }
  ]
  ```

---

#### `PATCH /families/:familyId/items/:itemId`
Actualiza datos de un movimiento existente (monto, título, nota, medio de pago, fecha).
- **Importante**: Este endpoint **no** permite cambiar la categoría ni el tag (para reclasificar, use `/category`). `amount` y `currency` son opcionales; si se envía `currency`, se aplica al importe actualizado según las reglas monetarias vigentes.
- **Autenticación**: Bearer Token + Miembro.
- **Request Body** (al menos una propiedad requerida):
  ```json
  {
    "amount": 28000,
    "currency": "CLP",
    "title": "Supermercado Jumbo",
    "note": "Ajuste de boleta",
    "occurredOn": "2026-10-12T13:00:00.000Z",
    "paymentMethodId": "m1m2m3m4-0000-4111-8222-111122223333"
  }
  ```
- **Respuesta `200 OK`**: Retorna el `FinancialItem` con los datos actualizados.
- **Errores posibles**:
  - `400`: `FINANCIAL.FUTURE_TRANSACTION_DATE`.
  - `404`: `FINANCIAL.FINANCIAL_ITEM_NOT_FOUND`.

---

#### `PATCH /families/:familyId/items/:itemId/category`
Reclasifica el movimiento hacia otra categoría y/o tag.
- **Autenticación**: Bearer Token + Miembro.
- **Request Body**:
  | Campo | Tipo | Requerido |
  |---|---|---|
  | `newCategoryId` | string (UUID) | Sí |
  | `newTagId` | string (UUID) \| null | No |
- **Respuesta `200 OK`**: Retorna el `FinancialItem` reclasificado.
- **Errores posibles**:
  - `400`: `FINANCIAL.CANNOT_RECLASSIFY_ACROSS_TYPES` (no se puede pasar un ítem de tipo EXPENSE a una categoría INCOME ni viceversa).
  - `400`: `FINANCIAL.CATEGORY_NOT_ACTIVE`.
  - `400`: `FINANCIAL.TAG_DOES_NOT_BELONG_TO_CATEGORY`.
  - `404`: `FINANCIAL.CATEGORY_NOT_FOUND`.

---

#### `DELETE /families/:familyId/items/:itemId`
Elimina físicamente un movimiento financiero y emite el evento de dominio correspondiente para ajustar reportes y presupuestos.
- **Autenticación**: Bearer Token + Miembro.
- **Respuesta `204 No Content`**
- **Errores posibles**:
  - `404`: `FINANCIAL.FINANCIAL_ITEM_NOT_FOUND`.

---

### 3.5 Presupuestos (`Budgeting`)

Gestión de presupuestos mensuales por categoría de gasto (`EXPENSE`). Permite un monto mensual predeterminado y sobreescrituras específicas por periodo (`YYYY-MM`).

#### `POST /families/:familyId/budgets`
Crea una configuración de presupuesto para una categoría de gasto.
- **Autenticación**: Bearer Token + Miembro.
- **Request Body**:
  | Campo | Tipo | Requerido | Descripción |
  |---|---|---|---|
  | `categoryId` | string (UUID) | Sí | Categoría de tipo EXPENSE |
  | `amount` | number | Sí | Monto límite mensual por defecto ($\ge 0$) |
  | `currency` | string | No | Moneda (default: moneda de la familia) |
- **Respuesta `201 Created`**:
  ```json
  {
    "id": "b0b1b2b3-0000-4111-8222-123456789abc",
    "familyId": "b1b2b3b4-1111-4222-8333-a1b2c3d4e5f6",
    "categoryId": "c1c2c3c4-0000-4111-8222-abcdefabcdef",
    "defaultAmount": {
      "amount": 200000,
      "currency": "CLP"
    },
    "isActive": true
  }
  ```
- **Errores posibles**:
  - `400`: `BUDGETING.CATEGORY_NOT_EXPENSE` (no se puede presupuestar una categoría de ingreso).
  - `409`: `BUDGETING.DUPLICATE_BUDGET_CONFIGURATION` (ya existe presupuesto para esta categoría).

---

#### `GET /families/:familyId/budgets`
Consulta el estado de ejecución presupuestaria de todas las categorías configuradas para un periodo dado.
- **Autenticación**: Bearer Token + Miembro.
- **Query Params**:
  - `period` (string `YYYY-MM`, opcional, default: mes en curso).
- **Respuesta `200 OK`**:
  ```json
  [
    {
      "budgetConfigurationId": "b0b1b2b3-0000-4111-8222-123456789abc",
      "categoryId": "c1c2c3c4-0000-4111-8222-abcdefabcdef",
      "categoryName": "Alimentación",
      "period": "2026-10",
      "limitAmount": {
        "amount": 200000,
        "currency": "CLP"
      },
      "spent": {
        "amount": 145000,
        "currency": "CLP"
      },
      "remaining": {
        "amount": 55000,
        "currency": "CLP"
      },
      "isOverspent": false
    }
  ]
  ```

---

#### `PATCH /families/:familyId/budgets/:budgetConfigurationId`
Actualiza el monto predeterminado recurrente del presupuesto.
- **Autenticación**: Bearer Token + Miembro.
- **Request Body**:
  ```json
  {
    "amount": 250000,
    "currency": "CLP"
  }
  ```
- **Respuesta `200 OK`**: Retorna el objeto `BudgetConfiguration` actualizado.

---

#### `PUT /families/:familyId/budgets/:budgetConfigurationId/overrides/:period`
Establece una sobreescritura de presupuesto para un periodo mensual puntual (ej. meses de vacaciones o eventos especiales).
- **Autenticación**: Bearer Token + Miembro.
- **Parámetros de ruta**: `period` con formato `YYYY-MM`.
- **Request Body**:
  ```json
  {
    "amount": 350000,
    "currency": "CLP"
  }
  ```
- **Respuesta `200 OK`**: Retorna el `BudgetConfiguration` con la sobreescritura aplicada.

---

#### `DELETE /families/:familyId/budgets/:budgetConfigurationId/overrides/:period`
Elimina la sobreescritura de un periodo, retornando al monto predeterminado para ese mes.
- **Autenticación**: Bearer Token + Miembro.
- **Respuesta `204 No Content`**
- **Errores posibles**:
  - `400`: `BUDGETING.NO_OVERRIDE_FOR_PERIOD`.

---

#### `POST /families/:familyId/budgets/:budgetConfigurationId/deactivate`
Desactiva la configuración del presupuesto sin borrar su historial.
- **Autenticación**: Bearer Token + Miembro.
- **Respuesta `200 OK`**: Retorna `BudgetConfiguration` con `isActive: false`.

---

### 3.6 Reportes y Analíticas (`Reporting & Analytics`)

Todos los reportes ofrecen vistas consolidadas de lectura optimizadas para visualizaciones en dashboards y gráficos de la app móvil.

#### `GET /families/:familyId/dashboard`
Obtiene el resumen consolidado del mes (ingresos totales, gastos totales, saldo neto y desglose porcentual por categorías de gasto).
- **Autenticación**: Bearer Token + Miembro.
- **Query Params**:
  - `period` (string `YYYY-MM`, opcional, default: mes en curso).
- **Respuesta `200 OK`**:
  ```json
  {
    "totalExpenses": {
      "amount": 450000,
      "currency": "CLP"
    },
    "totalIncome": {
      "amount": 1200000,
      "currency": "CLP"
    },
    "balance": { "amount": 750000, "currency": "CLP" },
    "categoryBreakdown": [
      {
        "categoryId": "c1c2c3c4-0000-4111-8222-abcdefabcdef",
        "totalExpense": {
          "amount": 270000,
          "currency": "CLP"
        },
        "percentage": 60
      },
      {
        "categoryId": "c2c3c4c5-0000-4111-8222-abcdefabcdef",
        "totalExpense": {
          "amount": 180000,
          "currency": "CLP"
        },
        "percentage": 40
      }
    ]
  }
  ```

---

#### `GET /families/:familyId/reports/by-payment-method`
Reporte de gastos agrupados por cada medio de pago para un periodo.
- **Autenticación**: Bearer Token + Miembro.
- **Query Params**:
  - `period` (string `YYYY-MM`, **requerido**).
- **Respuesta `200 OK`**:
  ```json
  [
    {
      "paymentMethodId": "m1m2m3m4-0000-4111-8222-111122223333",
      "paymentMethodName": "Tarjeta Santander",
      "amount": { "amount": 320000, "currency": "CLP" }
    },
    {
      "paymentMethodId": "m2m3m4m5-0000-4111-8222-111122223334",
      "paymentMethodName": "Efectivo",
      "amount": { "amount": 130000, "currency": "CLP" }
    }
  ]
  ```

---

#### `GET /families/:familyId/reports/breakdown`
Desglose detallado por categoría con nombre y monto para un periodo.
- **Autenticación**: Bearer Token + Miembro.
- **Query Params**:
  - `period` (string `YYYY-MM`, **requerido**).
  - `type` (opcional): `"EXPENSE"` \| `"INCOME"` (default: `"EXPENSE"`).
- **Respuesta `200 OK`**:
  ```json
  [
    {
      "categoryId": "c1c2c3c4-0000-4111-8222-abcdefabcdef",
      "categoryName": "Alimentación",
      "amount": 270000,
      "currency": "CLP"
    }
  ]
  ```

---

#### `GET /families/:familyId/reports/comparison`
Compara dos periodos mensuales (`periodA` vs `periodB`), calculando las variaciones porcentuales.
- **Autenticación**: Bearer Token + Miembro.
- **Query Params**:
  - `periodA` (string `YYYY-MM`, **requerido**).
  - `periodB` (string `YYYY-MM`, **requerido**).
  - `categoryId` (UUID, opcional): Comparar solo una categoría específica.
- **Respuesta `200 OK`**:
  ```json
  {
    "periodA": {
      "totalExpenses": { "amount": 400000, "currency": "CLP" },
      "totalIncome": { "amount": 1100000, "currency": "CLP" },
      "balance": { "amount": 700000, "currency": "CLP" }
    },
    "periodB": {
      "totalExpenses": { "amount": 450000, "currency": "CLP" },
      "totalIncome": { "amount": 1200000, "currency": "CLP" },
      "balance": { "amount": 750000, "currency": "CLP" }
    },
    "expenseVariation": 12.5,
    "incomeVariation": 9.09
  }
  ```

---

#### `GET /families/:familyId/reports/trend`
Evolución temporal mensual a lo largo de un rango de periodos. Ideal para gráficos de barras o líneas temporales.
- **Autenticación**: Bearer Token + Miembro.
- **Query Params**:
  - `fromPeriod` (string `YYYY-MM`, **requerido**).
  - `toPeriod` (string `YYYY-MM`, **requerido**).
  - `categoryId` (UUID, opcional): Filtrar por categoría.
- **Respuesta `200 OK`**:
  ```json
  [
    {
      "period": "2026-08",
      "totalExpenses": { "amount": 380000, "currency": "CLP" },
      "totalIncome": { "amount": 1050000, "currency": "CLP" },
      "balance": { "amount": 670000, "currency": "CLP" }
    },
    {
      "period": "2026-09",
      "totalExpenses": { "amount": 410000, "currency": "CLP" },
      "totalIncome": { "amount": 1100000, "currency": "CLP" },
      "balance": { "amount": 690000, "currency": "CLP" }
    },
    {
      "period": "2026-10",
      "totalExpenses": { "amount": 450000, "currency": "CLP" },
      "totalIncome": { "amount": 1200000, "currency": "CLP" },
      "balance": { "amount": 750000, "currency": "CLP" }
    }
  ]
  ```

---

#### `GET /families/:familyId/reports/drilldown`
Navegación jerárquica multinivel de gastos. El nivel de respuesta se adapta a los parámetros provistos:
1. Solo `period`: Retorna `level: "category"`.
2. `period` + `categoryId`: Retorna `level: "tag"`.
3. `period` + `categoryId` + `tagId`: Retorna `level: "item"` (transacciones individuales).
- **Autenticación**: Bearer Token + Miembro.
- **Query Params**:
  - `period` (string `YYYY-MM`, **requerido**).
  - `categoryId` (UUID, opcional).
  - `tagId` (UUID, opcional).
- **Respuestas según nivel (`200 OK`)**:
  - **Nivel Category** (`level: "category"`):
    ```json
    {
      "level": "category",
      "entries": [
        {
          "categoryId": "c1c2c3c4-0000-4111-8222-abcdefabcdef",
          "categoryName": "Alimentación",
          "amount": { "amount": 270000, "currency": "CLP" }
        }
      ]
    }
    ```
  - **Nivel Tag** (`level: "tag"`):
    ```json
    {
      "level": "tag",
      "entries": [
        {
          "tagId": "t1t2t3t4-0000-4111-8222-123456789abc",
          "tagName": "Supermercado",
          "amount": { "amount": 190000, "currency": "CLP" },
          "itemCount": 4
        }
      ]
    }
    ```
  - **Nivel Item** (`level: "item"`):
    ```json
    {
      "level": "item",
      "entries": [
        {
          "id": "i1i2i3i4-0000-4111-8222-111122223333",
          "familyId": "b1b2b3b4-1111-4222-8333-a1b2c3d4e5f6",
          "recordedBy": "d290f1ee-6c54-4b01-90e6-d701748f0851",
          "type": "EXPENSE",
          "amount": { "amount": 45000, "currency": "CLP" },
          "categoryId": "c1c2c3c4-0000-4111-8222-abcdefabcdef",
          "tagId": "t1t2t3t4-0000-4111-8222-123456789abc",
          "title": "Compra mensual",
          "note": null,
          "occurredOn": "2026-10-05T18:30:00.000Z",
          "createdAt": "2026-10-05T18:32:00.000Z"
        }
      ]
    }
    ```

---

### 3.7 Asistente de IA (`AI Assistance`)

Permite a los usuarios ingresar transacciones de forma ágil mediante lenguaje natural o fotografía de boletas/recibos.

#### `POST /families/:familyId/suggestions/text`
Procesa una descripción en lenguaje natural y extrae la sugerencia estructurada del gasto.
- **Autenticación**: Bearer Token + Miembro.
- **Request Body**:
  ```json
  {
    "rawText": "Gasté 18500 en farmacia Ahumada hoy para los remedios"
  }
  ```
- **Respuesta `201 Created`**:
  ```json
  {
    "id": "s1s2s3s4-0000-4111-8222-111122223333",
    "familyId": "b1b2b3b4-1111-4222-8333-a1b2c3d4e5f6",
    "requestedBy": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "status": "PENDING",
    "source": "TEXT",
    "amount": { "amount": 18500, "currency": "CLP" },
    "categoryId": "c3c4c5c6-0000-4111-8222-abcdefabcdef",
    "tagId": null,
    "occurredOn": "2026-10-12T00:00:00.000Z",
    "title": "Farmacia Ahumada",
    "confidence": 0.88,
    "rawInput": "Gasté 18500 en farmacia Ahumada hoy para los remedios"
  }
  ```

---

#### `POST /families/:familyId/suggestions/receipt`
Sube y escanea una imagen de recibo o boleta.
- **Autenticación**: Bearer Token + Miembro.
- **Content-Type**: `multipart/form-data`.
- **Payload**: Campo de archivo con la imagen (límite máximo: 10 MB, 1 archivo).
- **Respuesta `201 Created`**:
  ```json
  {
    "id": "s2s3s4s5-0000-4111-8222-111122223334",
    "familyId": "b1b2b3b4-1111-4222-8333-a1b2c3d4e5f6",
    "requestedBy": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "status": "PENDING",
    "source": "RECEIPT",
    "amount": { "amount": 34990, "currency": "CLP" },
    "categoryId": "c1c2c3c4-0000-4111-8222-abcdefabcdef",
    "tagId": null,
    "occurredOn": "2026-10-12T11:20:00.000Z",
    "title": "Supermercado Lider",
    "confidence": 0.94,
    "merchantName": "Lider Express",
    "receiptImageRef": "boleta_12102026.jpg"
  }
  ```
- **Errores posibles**:
  - `400`: `HTTP.INVALID_REQUEST_BODY` (si no se envía el archivo).
  - `400`: `AI.UNREADABLE_RECEIPT` (la imagen no contiene texto legible ni datos financieros reconocibles).

---

#### `POST /families/:familyId/suggestions/:suggestionId/confirm`
Confirma la sugerencia (opcionalmente aplicando correcciones manuales antes de guardar). Al confirmarse, se crea **inmediatamente el `FinancialItem`** correspondiente en el core financiero y se actualiza el histórico de comercios/categorías.
- **Autenticación**: Bearer Token + Miembro.
- **Request Body** (todos los campos son opcionales; si no se envían, se usan los valores sugeridos por la IA):
  ```json
  {
    "amount": 34990,
    "currency": "CLP",
    "categoryId": "c1c2c3c4-0000-4111-8222-abcdefabcdef",
    "tagId": "t1t2t3t4-0000-4111-8222-123456789abc",
    "occurredOn": "2026-10-12T11:20:00.000Z",
    "title": "Supermercado Lider"
  }
  ```
- **Respuesta `204 No Content`**
- **Errores posibles**:
  - `404`: `AI.SUGGESTION_NOT_FOUND`.
  - `400`: `AI.SUGGESTION_NOT_PENDING` (la sugerencia ya fue confirmada o descartada previamente).

---

#### `DELETE /families/:familyId/suggestions/:suggestionId`
Descarta una sugerencia sin persistirla en el registro financiero.
- **Autenticación**: Bearer Token + Miembro.
- **Respuesta `204 No Content`**
- **Errores posibles**:
  - `404`: `AI.SUGGESTION_NOT_FOUND`.
  - `400`: `AI.SUGGESTION_NOT_PENDING`.

---

## 4. Diccionario de Códigos de Error de Dominio

| Código (`error`) | HTTP Status | Causa principal | Acción recomendada en la App |
|---|---|---|---|
| `HTTP.INVALID_REQUEST_BODY` | 400 | El cuerpo JSON no cumple el schema (tipos, campos faltantes, formatos). | Validar entradas localmente antes de enviar. |
| `IDENTITY.WEAK_PASSWORD` | 400 | La contraseña tiene menos de 8 caracteres. | Mostrar regla de mínimo 8 caracteres en formulario. |
| `IDENTITY.INVALID_DISPLAY_NAME` | 400 | El nombre está vacío o supera 60 caracteres. | Validar longitud en input de texto. |
| `IDENTITY.EMAIL_ALREADY_REGISTERED` | 409 | El email ya pertenece a otro usuario registrado. | Indicar al usuario que inicie sesión o recupere acceso. |
| `IDENTITY.INVALID_CREDENTIALS` | 401 | Credenciales de login o contraseña actual erróneas. | Mostrar mensaje de credenciales incorrectas. |
| `AUTH.INVALID_REFRESH_TOKEN` | 401 | El refresh token expiró o no existe. | Forzar redirección al login. |
| `AUTH.POSSIBLE_TOKEN_THEFT` | 401 | Se reusó un refresh token ya utilizado. | Redirigir a login alertando sobre sesión cerrada por seguridad. |
| `FAMILY.INVALID_FAMILY_NAME` | 400 | Nombre de familia vacío o mayor a 60 caracteres. | Validar tamaño en input. |
| `FAMILY.INVALID_FAMILY_ORDER` | 400 | La lista de IDs para reordenar no coincide con las familias del usuario. | Refrescar listado antes de enviar reordenamiento. |
| `FAMILY.ALREADY_MEMBER` | 409 | El email invitado ya pertenece a la familia. | Alertar que el usuario ya es miembro. |
| `FAMILY.INVITATION_NOT_FOUND` | 404 | La invitación no existe. | Informar que la invitación no fue encontrada. |
| `FAMILY.INVITATION_EXPIRED` | 400 | La invitación superó su tiempo de vigencia. | Solicitar al administrador un nuevo reenvío. |
| `FAMILY.INVITATION_NOT_PENDING` | 400 | La invitación ya fue aceptada o revocada. | Mostrar estado actualizado. |
| `FAMILY.CANNOT_REMOVE_LAST_OWNER` | 400 | Se intentó degradar o remover al único OWNER. | Notificar que se debe promover a otro miembro antes. |
| `FAMILY.INSUFFICIENT_ROLE` | 403 | El usuario no cuenta con rol OWNER para esta acción. | Ocultar botones de administración a usuarios MEMBER. |
| `FINANCIAL.DUPLICATE_PAYMENT_METHOD_NAME` | 409 | Ya existe un medio de pago con ese nombre. | Solicitar un nombre diferenciado. |
| `FINANCIAL.PAYMENT_METHOD_HAS_ASSOCIATED_ITEMS` | 409 | No se puede eliminar porque tiene transacciones vinculadas. | Ofrecer la opción de "Deprecar / Desactivar". |
| `FINANCIAL.PAYMENT_METHOD_IS_SOMEONES_DEFAULT` | 409 | Es el medio por defecto de un miembro de la familia. | Avisar que el usuario debe cambiar su default primero. |
| `FINANCIAL.NO_DEFAULT_PAYMENT_METHOD_SET` | 400 | Se intentó crear ítem sin método y el usuario no tiene default. | Pedir al usuario que seleccione un método o configure su default. |
| `FINANCIAL.DUPLICATE_CATEGORY_NAME` | 409 | Ya existe una categoría con ese nombre y tipo. | Avisar duplicado de categoría. |
| `FINANCIAL.CATEGORY_HAS_ASSOCIATED_ITEMS` | 409 | No se puede eliminar categoría con transacciones. | Ofrecer deprecación. |
| `FINANCIAL.FUTURE_TRANSACTION_DATE` | 400 | La fecha de la transacción es futura. | Bloquear fechas futuras en el datepicker de la app. |
| `FINANCIAL.CANNOT_RECLASSIFY_ACROSS_TYPES` | 400 | Cambio incompatible entre EXPENSE e INCOME. | Limitar las categorías seleccionables al mismo tipo. |
| `FINANCIAL.TAG_DOES_NOT_BELONG_TO_CATEGORY` | 400 | El tag seleccionado no pertenece a la categoría elegida. | Filtrar los tags dependientes de la categoría. |
| `BUDGETING.CATEGORY_NOT_EXPENSE` | 400 | Se intentó presupuestar una categoría de INCOME. | Permitir presupuestos únicamente en categorías de gastos. |
| `BUDGETING.DUPLICATE_BUDGET_CONFIGURATION` | 409 | La categoría ya tiene un presupuesto configurado. | Abrir la pantalla de edición del presupuesto existente. |
| `AI.SUGGESTION_NOT_FOUND` | 404 | La sugerencia de IA no existe. | Descartar de la cola visual de sugerencias. |
| `AI.SUGGESTION_NOT_PENDING` | 400 | La sugerencia ya fue resuelta (confirmada o descartada). | Descartar de la cola visual de sugerencias. |
| `AI.UNREADABLE_RECEIPT` | 400 | No se pudo extraer información del recibo. | Sugerir tomar una fotografía con mejor iluminación y encuadre. |

---

## 5. Recomendaciones de Implementación para el Cliente Kotlin (Android)

1. **Gestión de Sesión con Ktor / OkHttp `Authenticator`**:
   - Implementar un `Interceptor` que adjunte `Authorization: Bearer <accessToken>`.
   - Implementar `Authenticator` para responder al status `401`: sincronizar la llamada a `POST /auth/refresh`, guardar los nuevos tokens en `EncryptedSharedPreferences` o `DataStore`, y reintentar la petición original.
   - Si `POST /auth/refresh` responde `401` (`AUTH.INVALID_REFRESH_TOKEN` o `AUTH.POSSIBLE_TOKEN_THEFT`), limpiar el almacenamiento local y redirigir inmediatamente a la pantalla de Login.

2. **Caché y Trabajo Offline-First**:
   - Almacenar categorías, tags y medios de pago en base de datos local (Room).
   - En el formulario de registro de gasto, preseleccionar automáticamente el `defaultPaymentMethod` del usuario y limitar la selección de fecha máxima a la hora actual (`now()`).

3. **Flujo de Asistencia de IA**:
   - Presentar las sugerencias devueltas por `POST /families/:familyId/suggestions/text` o `POST /families/:familyId/suggestions/receipt` en un formulario de revisión previa ("Bottom Sheet" o "Preview Dialog").
   - El usuario puede editar cualquier valor sugerido (monto, categoría, fecha, descripción) antes de presionar "Confirmar", enviando dichas modificaciones en `POST /families/:familyId/suggestions/:suggestionId/confirm`.


---

## 6. Brechas: lo que la app necesita y el contrato aún no ofrece

Cada brecha tiene un ID que se usa en `plan-implementacion-brechas-api.md`. Todo lo de esta sección es **📐 propuesto** salvo que se indique lo contrario.

### 6.0 Transversal

| ID | Brecha | Por qué importa a la app |
| :--: | --- | --- |
| T1 | Los errores `401` y `403` del middleware llegan como `{ "error": "Missing token" }` / `"Invalid or expired token"` / `"Not a member of this family"` / `"Insufficient role"`: sin `code` en formato `DOMINIO.CODIGO` ni `message` | El `Authenticator` de la app necesita distinguir "sin token" de "token expirado" sin comparar texto en inglés |
| T2 | Formato de dinero inconsistente (items con `amount` + `currency` planos; reportes y presupuestos con `{ amount, currency }`; `balance` suelto) **y montos como `number` sin soporte para los decimales de USD/EUR** | **Decididos D1 y D9.** Todo importe es un entero en unidades menores; toda respuesta lo entrega como `Money`. Las variaciones y porcentajes siguen siendo números |
| T3 | Los items admiten `CLP`, `USD` y `EUR` mezclados dentro de una misma familia | **Resuelta por D2 (reglas C1–C4):** una familia, una moneda. Se eliminan los bloques por moneda de los reportes |
| T4 | El mes de un movimiento depende de la zona horaria: un gasto del 31-oct 23:30 en Chile ya es noviembre en UTC | Períodos calculados en `America/Santiago` (configurable); afecta a reportes y presupuestos |

### 6.0b Moneda de la familia

| ID | Brecha | Propuesta |
| :--: | --- | --- |
| C1 | Un item, presupuesto o sugerencia puede declarar otra moneda | `currency` opcional; si difiere de la familia → `SHARED.CURRENCY_MISMATCH` (409). Desaparece la regla "si envías `amount` debes enviar `currency`" |
| C2 | `PATCH .../settings/currency` cambia la moneda aunque haya datos | Solo si no hay items ni presupuestos activos; si no → `FAMILY.CURRENCY_LOCKED` (409) con `details.reasons`. Si se borran todos los items, vuelve a poder cambiarse. Cambiar a la misma moneda es un no-op (204) |
| C3 | La app no sabe si puede cambiar la moneda | `GET /families/:familyId/settings` → `{ defaultCurrency, currencyLocked, currencyLockReasons[] }` |

### 6.1 Invitaciones y miembros (pantallas: Selector de familias, Gestión de familia)

| ID | Brecha | Propuesta |
| :--: | --- | --- |
| A1 | No hay forma de que el invitado **vea sus invitaciones pendientes** | `GET /me/invitations` |
| A2 | No se puede **rechazar** una invitación (`DELETE /invitations/:id` es para quien invita y su autorización está descrita de forma ambigua: "creador o administrador") | `POST /invitations/:invitationId/decline`, nuevo estado `DECLINED` |
| A3 | El Owner no puede **listar las invitaciones** de su familia | `GET /families/:familyId/invitations?status=PENDING` |
| A4 | `GET /families/:familyId/members` devuelve solo `userId`, `role`, `joinedAt` | Añadir `displayName` (todos) y `email` (solo si quien consulta es OWNER) |
| A5 | `GET /me/families` devuelve `familyId`, `name`, `role` | Añadir `defaultCurrency` y `memberCount` |
| A6 | `GET /me/profile` no devuelve `userId` | Añadir `userId` |

### 6.2 Dashboard y reportes (pantallas: Inicio, Reportes)

| ID | Brecha | Propuesta |
| :--: | --- | --- |
| B1 | `dashboard.categoryBreakdown` trae solo `categoryId`, y solo gastos | `expenseByCategory[]` e `incomeByCategory[]` con `categoryId`, `name`, `icon`, `status`, `amount` (Money), `percentage`; `currency` a nivel superior |
| B2 | No aparecen las categorías **sin movimientos**, pero el diseño muestra `$0` | Incluir todas las categorías activas, más las deprecadas que tengan movimientos en el período |
| B3 | `dashboard.balance` es un número suelto | Devolverlo como `Money` (ver T2) |
| B4 | `breakdown` no trae `icon`, `status` ni `percentage` | Añadirlos; parámetro `includeEmpty`; `currency` y `total` a nivel superior |
| B5 | `comparison`: no se documenta qué pasa cuando el período base es 0; los períodos se llaman `periodA`/`periodB` tanto en la consulta como en la respuesta | `expenseVariation` e `incomeVariation` pasan a `number \| null` (null si el base es 0); la respuesta usa `a` y `b` y un `currency` superior |
| B6 | `trend`: no se documenta si los meses sin datos aparecen ni el rango máximo | Rellenar meses vacíos con 0; rango máximo 24 meses; `REPORTING.INVALID_PERIOD_RANGE`; respuesta `{ fromPeriod, toPeriod, currency, points[] }` |
| B7 | `drilldown` solo describe gastos y sus entradas no traen `icon`, `percentage` ni `itemCount` homogéneos | Parámetro `type` (default `EXPENSE`); añadir `icon`, `percentage` e `itemCount` en niveles `category` y `tag` |
| B8 | Los períodos inválidos no tienen código de error propio | `REPORTING.INVALID_PERIOD` |

### 6.3 Movimientos (pantalla: Listado y detalle)

| ID | Brecha | Propuesta |
| :--: | --- | --- |
| I1 | `GET /items` **no devuelve `paymentMethodId`** (sí lo hace el `POST`) | Añadirlo |
| I2 | `from` y `to` deben enviarse juntos y no hay paginación ni orden documentado | `limit` + `cursor` opaco; respuesta `{ items, nextCursor }`; `from` y `to` independientes; orden por `occurredOn` descendente |
| I3 | `recordedBy` es un UUID: la app no puede mostrar quién registró el movimiento | Añadir `recordedByName` (mismo mecanismo que A4) |

### 6.4 Sugerencias de IA (pantallas: Registro con texto, Registro con recibo)

| ID | Brecha | Propuesta |
| :--: | --- | --- |
| S1 | Si la app se cierra durante la revisión, la sugerencia se pierde | `GET /families/:familyId/suggestions?status=PENDING` (solo las del usuario) |
| S2 | `confirm` responde `204`: la app no sabe qué item se creó | Responder `201` con el `FinancialItem` creado |
| S3 | La sugerencia y `confirm` no incluyen `paymentMethodId` ni `note` | Añadirlos; si falta `paymentMethodId` se usa el predeterminado del usuario (y falla con `NO_DEFAULT_PAYMENT_METHOD_SET` si no existe) |
| S4 | No se sabe **de dónde salió la categoría** (historial de comercios o modelo) | Campo `classificationOrigin`: `HISTORY` \| `AI` \| `NONE` |
| S5 | Si no hay categoría sugerida, `categoryId` es `null` y `confirm` no define qué ocurre | `confirm` exige `categoryId` si la sugerencia no trae; error `AI.CATEGORY_REQUIRED` |
| S6 | Texto sin monto o ilegible no tiene error propio | `AI.UNPARSEABLE_TEXT`; `rawText` de 1 a 500 caracteres |
| S7 | Las sugerencias pendientes no caducan | `expiresAt` (24 h) y `AI.SUGGESTION_EXPIRED` |
| S8 | Límites de uso de IA: solo declarados como intención | `429` `AI.USAGE_LIMIT_EXCEEDED` con `limit`, `used` y `resetsAt`, y `GET /families/:familyId/ai-usage` |
| S9 | Upload de recibo: sin nombre de campo ni tipos aceptados documentados | Documentar campo `file`, tipos `image/jpeg`, `image/png`, `image/webp`; `AI.UNSUPPORTED_IMAGE_TYPE`; `413` por tamaño |
| S10 | No existen `POST /assistant/ask` ni `GET /insights` (estaban en el plan original) | Fuera de este alcance; se abordan después (pantalla Asistente) |

---

## 7. Discrepancias detectadas

### 7.1 Colección Postman vs. contrato verificado

La colección actual **fallaría** en estos puntos; hay que corregirla:

| Petición de Postman | Problema | Corrección |
| --- | --- | --- |
| *Rename Payment Method* | Envía `{ "newName": ... }` | El contrato espera `{ "name": ... }` |
| *Rename Tag* | Envía `{ "newName": ... }` | El contrato espera `{ "name": ... }` |
| *Update Financial Item* | Envía `amount` sin `currency` | Si se envía `amount` hay que enviar `currency` (y viceversa) |
| *Get Expenses By Payment Method* | Sin query params | `period=YYYY-MM` es obligatorio |
| *Create Financial Item* | `occurredOn: "2026-09-01"` | El contrato indica ISO 8601 con hora y no admite fechas futuras; verificar si acepta solo fecha |
| *Change Member Role* (si se agrega) | — | El campo es `newRole` |

### 7.2 Supuestos de mi v1 que eran incorrectos

- Budgeting, Reporting (`dashboard`, `breakdown`, `comparison`, `trend`, `drilldown`, `by-payment-method`) y AI (`suggestions/text`, `suggestions/receipt`, `confirm`, `DELETE`) **ya están expuestos**.
- Monedas soportadas: `CLP`, `USD`, `EUR` (no solo CLP).
- Categorías, tags, presupuestos y cambios de rol/moneda: el rol exigido para gestionar **categorías y tags es OWNER**; los medios de pago, movimientos y presupuestos los gestiona cualquier miembro.
- Formato de error: `{ error, message }` (v1 mostraba `code`).

### 7.3 Puntos a confirmar en el código

- `DELETE /invitations/:invitationId`: ¿quién puede revocar? ¿Owner de la familia, quien creó la invitación o ambos?
- `POST /invitations/:id/accept`: cuando el email no coincide responde `403` pero sin código documentado.
- Duplicados de categoría: el contrato dice que cuentan también las deprecadas.
- `PATCH .../tags/:tagId` (renombrar tag): no documenta errores (`DUPLICATE_TAG_NAME`, `TAG_NOT_FOUND`).
- Items: ¿acepta `occurredOn` con solo fecha?

---

## 8. Mapa pantalla → endpoints

| Pantalla de la app | Endpoints que consume | Brechas que la bloquean |
| --- | --- | --- |
| Login / registro | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` | T1 |
| Selector de familias | `GET /me/families`, `PUT /me/families/order`, `POST /families`, `GET /me/invitations`, `POST /invitations/:id/accept`, `POST /invitations/:id/decline` | A1, A2, A5 |
| Gestión de familia | `GET /families/:id/members`, `GET/POST /families/:id/invitations`, `DELETE /invitations/:id`, `PATCH .../members/:id/role`, `DELETE .../members/:id`, `PATCH .../settings/currency` | A3, A4 |
| Dashboard | `GET /families/:id/dashboard`, `GET /families/:id/categories` | B1–B3, T2, T4 |
| Categorías | `GET/POST/PATCH/DELETE /families/:id/categories...`, tags | — |
| Registro manual | `POST /families/:id/items`, `GET .../categories`, `GET .../payment-methods` | — |
| Registro con texto | `POST .../suggestions/text`, `POST .../suggestions/:id/confirm`, `DELETE .../suggestions/:id` | S2–S6, S8 |
| Registro con recibo | `POST .../suggestions/receipt` (+ las de arriba) | S2–S5, S8, S9 |
| Listado y detalle | `GET /families/:id/items`, `PATCH`, `DELETE`, `PATCH .../category` | I1–I3 |
| Reportes | `breakdown`, `comparison`, `trend`, `drilldown`, `by-payment-method` | B4–B8 |
| Presupuestos | `GET/POST/PATCH /families/:id/budgets...`, overrides, deactivate | — |
| Asistente / Insights | — (no existe todavía) | S10 |
| Perfil y ajustes | `GET /me/profile`, `PATCH /me/display-name`, `PATCH /me/password`, `PUT .../me/default-payment-method`, `GET /families/:id/settings`, `PATCH .../settings/currency` | A6, C2, C3 |

---

## 9. Códigos de error que el diccionario de la sección 4 no recoge

Los siguientes aparecen en las descripciones de endpoints, pero faltan en la tabla. Se añaden aquí para que la app los traduzca.

| Código | HTTP | Cuándo | Mensaje sugerido |
| --- | :--: | --- | --- |
| `FAMILY.MEMBER_NOT_FOUND` | 404 | El miembro no existe en la familia | "Este miembro ya no pertenece a la familia." |
| `FINANCIAL.CATEGORY_NOT_FOUND` | 404 | Categoría inexistente | "La categoría ya no existe." |
| `FINANCIAL.CATEGORY_NOT_ACTIVE` | 400 | Categoría deprecada usada en un registro nuevo | "Esta categoría está archivada." |
| `FINANCIAL.PAYMENT_METHOD_NOT_FOUND` | 404 | Medio de pago inexistente | "El medio de pago ya no existe." |
| `FINANCIAL.PAYMENT_METHOD_NOT_ACTIVE` | 400 | Medio de pago deprecado | "Este medio de pago está archivado." |
| `FINANCIAL.FINANCIAL_ITEM_NOT_FOUND` | 404 | Movimiento inexistente | "El movimiento ya no existe." |
| `FINANCIAL.DUPLICATE_TAG_NAME` | 409 | Tag repetido en la categoría | "Ya existe un tag con ese nombre." |
| `FINANCIAL.TAG_HAS_ASSOCIATED_ITEMS` | 409 | Borrar tag con movimientos | "Tiene movimientos asociados. Puedes archivarlo." |
| `SHARED.INVALID_EMAIL` | 400 | Email con formato inválido | "Revisa el correo electrónico." |
| `SHARED.UNSUPPORTED_CURRENCY` | 400 | Moneda no soportada | "Moneda no disponible." |
| `BUDGETING.NO_OVERRIDE_FOR_PERIOD` | 400 | Quitar un override inexistente | "Ese mes no tiene un presupuesto especial." |
| `INTERNAL.UNEXPECTED_ERROR` | 500 | Error no controlado | "Algo salió mal. Inténtalo de nuevo." |
| 📐 `SHARED.CURRENCY_MISMATCH` | 409 | Item, presupuesto o sugerencia en una moneda distinta a la de la familia | "La moneda no coincide con la de la familia." |
| 📐 `FAMILY.CURRENCY_LOCKED` | 409 | Cambiar la moneda con items o presupuestos activos (`details.reasons`) | "No puedes cambiar la moneda mientras haya movimientos o presupuestos activos." |
| 📐 `SHARED.INVALID_AMOUNT` | 400 | Monto no entero o fuera de rango seguro | "Revisa el monto." |
| 📐 `REPORTING.INVALID_PERIOD` | 400 | Período mal formado | "Período no válido." |
| 📐 `REPORTING.INVALID_PERIOD_RANGE` | 400 | Rango de meses inválido o mayor a 24 | "Elige un rango de hasta 24 meses." |
| 📐 `FAMILY.INVITATION_NOT_FOR_USER` | 403 | Aceptar o rechazar una invitación de otro email | "Esta invitación no es para tu cuenta." |
| 📐 `AI.UNPARSEABLE_TEXT` | 400 | Texto sin monto interpretable | "No pude entender el texto. Incluye un monto." |
| 📐 `AI.CATEGORY_REQUIRED` | 400 | Confirmar sin categoría | "Elige una categoría." |
| 📐 `AI.SUGGESTION_EXPIRED` | 400 | Sugerencia vencida (24 h) | "La sugerencia expiró. Genera otra." |
| 📐 `AI.UNSUPPORTED_IMAGE_TYPE` | 400 | Imagen en formato no admitido | "Usa una imagen JPEG, PNG o WebP." |
| 📐 `AI.USAGE_LIMIT_EXCEEDED` | 429 | Cupo diario de IA agotado (`details.limit/used/resetsAt`) | "Llegaste al límite diario de IA." |
| 📐 Errores 401/403 de middleware | 401/403 | Hoy sin código; pasan a `AUTH.MISSING_TOKEN`, `AUTH.INVALID_TOKEN`, `FAMILY.NOT_A_MEMBER`, `FAMILY.INSUFFICIENT_ROLE` | Según el código |

Los códigos que introduce el plan de brechas (marcados 📐) se listan al final de `plan-implementacion-brechas-api.md`.

---

## 10. Cómo mantener este documento

1. Cuando una brecha se implemente, **mueve su fila a la sección 3**, pega una respuesta real y quítala de la sección 6.
2. Si el backend cambia un contrato, actualiza este archivo **en el mismo cambio**.
3. Cada `SPEC.md` de la app enlaza la sección que usa y lista como `PENDIENTE` cualquier brecha abierta que la afecte.
4. La colección Postman es la fuente ejecutable; este documento es su resumen legible. Si discrepan, gana el código.
