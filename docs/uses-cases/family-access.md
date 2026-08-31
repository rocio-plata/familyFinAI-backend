# Family & Access — Casos de uso

Documentación de los casos de uso del contexto `Family & Access`, previa a su implementación. Sirve como contrato entre el diseño de dominio ya definido (`Family`, `Member`, `Invitation`, `Role`) y la capa de aplicación que vamos a construir.

Convención: cada caso de uso indica **actor**, **precondiciones**, **flujo principal**, **flujos alternativos/errores**, y **eventos de dominio disparados**.

---

## 1. CreateFamily

Crea una nueva familia y establece al usuario creador como su primer `Owner`.

- **Actor**: cualquier usuario autenticado sin familia previa (o que quiere crear una adicional, si el modelo lo permite).
- **Precondiciones**: el usuario está autenticado (`authenticate` ya pasó).
- **Entrada**: `name` (nombre de la familia), `createdBy` (UserId, viene del token).
- **Flujo principal**:
  1. Se valida `name` como `FamilyName` (VO ya definido).
  2. Se invoca `Family.create(name, createdBy)`.
  3. El creador queda como único `Member` con rol `Owner`.
  4. La moneda por defecto se fija en `Currency.default()` (CLP).
  5. Se persiste la familia vía `FamilyRepository.save()`.
- **Errores posibles**: `InvalidFamilyNameError` (nombre vacío o excede longitud máxima).
- **Eventos disparados**: `FamilyCreated`.

---

## 2. InviteMember

Invita a una persona (por email) a unirse a la familia con un rol determinado.

- **Actor**: un `Member` con rol que permita invitar (por ahora, definido igual que `canRemoveMembers()` — solo `Owner`; a revisar si se separa en un permiso propio).
- **Precondiciones**: la familia existe; quien invita es miembro de la familia.
- **Entrada**: `familyId`, `email`, `role` (rol propuesto para el invitado).
- **Flujo principal**:
  1. Se busca la `Family` por `familyId`.
  2. Se consulta `UserDirectoryPort.findUserIdByEmail(email)` para saber si el email ya tiene cuenta.
  3. Si existe `UserId` y ya es miembro de la familia (`family.findMembership()`), se rechaza.
  4. Se llama `family.inviteMember(email, role)`, que crea una `Invitation` en estado `Pending` (expira en 7 días).
  5. Se persiste la `Invitation` vía `InvitationRepository.save()`.
- **Errores posibles**: `FamilyNotFoundError`, `AlreadyMemberError`, `InsufficientRoleError` (si quien invita no tiene permisos).
- **Eventos disparados**: `MemberInvited`.
- **Pendiente de definir**: envío real de la invitación (email/notificación) — fuera de alcance del dominio, correspondería a un contexto de notificaciones futuro que escuche `MemberInvited`.

---

## 3. AcceptInvitation

El usuario invitado acepta la invitación y se convierte en miembro de la familia.

- **Actor**: el usuario dueño del email invitado, ya autenticado.
- **Precondiciones**: existe una `Invitation` con el id/token recibido.
- **Entrada**: `invitationId` (o token de invitación), `acceptingUserId` (UserId del usuario autenticado que acepta).
- **Flujo principal**:
  1. Se busca la `Invitation` por su id.
  2. Se invoca `invitation.accept(acceptingUserId)` — valida que esté `Pending` y no expirada.
  3. Se dispara `InvitationAccepted` desde la propia `Invitation`.
  4. Un event handler (`OnInvitationAcceptedHandler`, dentro del mismo contexto) escucha el evento y llama a `family.addMemberFromInvitation(invitation)` **en una transacción separada** (no se modifican dos agregados en la misma operación).
  5. Se persisten ambos agregados (`Invitation` actualizada, `Family` con el nuevo `Member`).
- **Errores posibles**: `InvitationNotPendingError`, `InvitationExpiredError`.
- **Eventos disparados**: `InvitationAccepted`.

---

## 4. RevokeInvitation

Cancela una invitación pendiente antes de que sea aceptada.

- **Actor**: un `Member` con permisos suficientes (mismo criterio que `InviteMember`).
- **Precondiciones**: la `Invitation` existe y está `Pending`.
- **Entrada**: `invitationId`.
- **Flujo principal**:
  1. Se busca la `Invitation`.
  2. Se invoca `invitation.revoke()`.
  3. Se persiste el cambio de estado.
- **Errores posibles**: `InvitationNotPendingError` (no se puede revocar una ya aceptada/expirada).
- **Eventos disparados**: ninguno por ahora (no hay otro contexto que necesite reaccionar).

---

## 5. RemoveMember

Remueve a un miembro de la familia.

- **Actor**: un `Member` con rol `Owner`.
- **Precondiciones**: quien remueve es `Owner`; el miembro a remover existe en la familia.
- **Entrada**: `familyId`, `memberId` (UserId a remover), `removedBy` (UserId de quien ejecuta la acción).
- **Flujo principal**:
  1. Se busca la `Family`.
  2. Se invoca `family.removeMember(memberId, removedBy)`.
  3. La entidad valida que quien remueve tenga permisos (`InsufficientRoleError` si no).
  4. La entidad valida que quede al menos un `Owner` tras la remoción (`CannotRemoveLastOwnerError` si no).
  5. Se persiste la familia actualizada.
- **Errores posibles**: `InsufficientRoleError`, `CannotRemoveLastOwnerError`, `MemberNotFoundError`.
- **Eventos disparados**: `MemberRemoved`.
- **Nota de impacto cruzado**: `Financial Tracking` no elimina ni reasigna los `FinancialItem` ya registrados por el miembro removido — el dato histórico de `recordedBy` se preserva.

---

## 6. ChangeMemberRole

Cambia el rol de un miembro existente.

- **Actor**: un `Member` con rol `Owner`.
- **Precondiciones**: quien ejecuta es `Owner`; el miembro objetivo existe en la familia.
- **Entrada**: `familyId`, `memberId`, `newRole`.
- **Flujo principal**:
  1. Se busca la `Family`.
  2. Se invoca `family.changeRole(memberId, newRole)`.
  3. La entidad valida que, tras el cambio, siga quedando al menos un `Owner`.
  4. Se persiste la familia actualizada.
- **Errores posibles**: `MemberNotFoundError`, `CannotRemoveLastOwnerError` (si el cambio dejaría a la familia sin `Owner`).
- **Eventos disparados**: `MemberRoleChanged`.

---

## 7. ChangeDefaultCurrency

Cambia la moneda por defecto de la familia (usada al crear nuevos `FinancialItem` sin moneda explícita).

- **Actor**: un `Member` con rol `Owner`.
- **Precondiciones**: la familia existe.
- **Entrada**: `familyId`, `newCurrency`, `changedBy`.
- **Flujo principal**:
  1. Se busca la `Family`.
  2. Se valida que `changedBy` tenga rol `Owner`.
  3. Se invoca `family.changeDefaultCurrency(newCurrency)`.
  4. Se persiste la familia actualizada.
- **Errores posibles**: `InsufficientRoleError`, `UnsupportedCurrencyError` (si la moneda no está soportada).
- **Eventos disparados**: ninguno por ahora — es un dato de configuración sin efecto en otros contextos hasta que se cree un nuevo `FinancialItem`.

---

## 8. GetFamilyMembership (query)

Consulta si un usuario pertenece a una familia y con qué rol. Es el caso de uso que ya conecta con el middleware HTTP `requireFamilyMembership`.

- **Actor**: infraestructura (`platform/auth`), no un usuario directamente.
- **Entrada**: `familyId`, `userId`.
- **Flujo principal**:
  1. Se busca la `Family` por `familyId`.
  2. Se invoca `family.findMembership(userId)`.
  3. Devuelve `Membership` (rol + fecha de ingreso) o `null` si no pertenece.
- **Errores posibles**: ninguno propio — la ausencia de membresía es un resultado válido (`null`), no una excepción.

---

## 9. GetFamilyMembers (query)

Lista todos los miembros de una familia, para pantallas de administración dentro de la app.

- **Actor**: cualquier `Member` de la familia.
- **Entrada**: `familyId`.
- **Flujo principal**:
  1. Se busca la `Family`.
  2. Se devuelve `family.members` (solo lectura) mapeado a un DTO de salida (probablemente enriquecido con datos del usuario — nombre, email — que viven fuera de este contexto).
- **Errores posibles**: `FamilyNotFoundError`.

---

## Resumen de errores del contexto usados en estos casos de uso

| Error | Casos de uso donde aparece |
|---|---|
| `InvalidFamilyNameError` | CreateFamily |
| `InvalidEmailError` | InviteMember |
| `AlreadyMemberError` | InviteMember |
| `InsufficientRoleError` | InviteMember, RemoveMember, ChangeDefaultCurrency |
| `CannotRemoveLastOwnerError` | RemoveMember, ChangeMemberRole |
| `MemberNotFoundError` | RemoveMember, ChangeMemberRole |
| `InvitationNotPendingError` | AcceptInvitation, RevokeInvitation |
| `InvitationExpiredError` | AcceptInvitation |
| `FamilyNotFoundError` | InviteMember, GetFamilyMembers *(pendiente de implementar — referenciado pero no definido aún)* |
| `UnsupportedCurrencyError` | ChangeDefaultCurrency |

## Pendientes antes de implementar

1. **`FamilyNotFoundError`** — referenciado en varios casos de uso pero su clase todavía no fue escrita.
2. **Permisos de `InviteMember`/`RemoveMember`** — hoy usan el mismo criterio que `Owner` puro; falta decidir si se separan en permisos más granulares (ver nota que dejamos abierta en `Role`).
3. **Notificación real de invitaciones** (email) — fuera del alcance de este contexto, pero condiciona si `MemberInvited` necesita más datos en el payload del evento.
4. **DTOs de salida** — ninguno de estos casos de uso tiene todavía definida su forma de respuesta HTTP (por ejemplo, qué campos exactos devuelve `GetFamilyMembers`).