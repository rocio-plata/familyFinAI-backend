# Identity — Casos de uso

Documentación de los casos de uso del contexto `Identity` (`src/contexts/identity/`), alineada con
el código actual. Gestiona usuarios, credenciales y perfil; los tokens los emite
`TokenService` de `src/platform/auth/`.

## Casos de uso implementados

| Caso de uso | Ruta | Descripción | Errores |
|---|---|---|---|
| `RegisterUserUseCase` | `POST /auth/register` | Crea el usuario (`email`, `password` de al menos 8 caracteres, `displayName` de hasta 60) y devuelve el par `accessToken`/`refreshToken`. | `IDENTITY.WEAK_PASSWORD`, `IDENTITY.INVALID_DISPLAY_NAME`, `IDENTITY.EMAIL_ALREADY_REGISTERED` (409), `SHARED.INVALID_EMAIL` |
| `LoginUseCase` | `POST /auth/login` | Valida credenciales y devuelve el par de tokens. | `IDENTITY.INVALID_CREDENTIALS` (401) |
| `GetUserProfileQuery` | `GET /me/profile` | Devuelve `userId`, `email`, `displayName`, `createdAt`. | `IDENTITY.USER_NOT_FOUND` |
| `UpdateDisplayNameUseCase` | `PATCH /me/display-name` | Cambia el nombre visible. | `IDENTITY.INVALID_DISPLAY_NAME` |
| `ChangePasswordUseCase` | `PATCH /me/password` | Cambia la contraseña verificando la actual. | `IDENTITY.INVALID_CREDENTIALS`, `IDENTITY.WEAK_PASSWORD` |
| `GetUserIdByEmailQuery` | uso interno | Resuelve un `userId` por email (invitaciones). | — |

## Pendientes

- `POST /auth/refresh` y `POST /auth/logout` están documentados en `api-contract.md` y
  `openapi.yaml`, pero **no están expuestos por HTTP**. `TokenService.refresh` ya implementa la
  rotación y la detección de reuso (`AUTH.POSSIBLE_TOKEN_THEFT`); falta la ruta y el caso de uso de
  logout (revocar todos los refresh tokens del usuario).
