# Identity — Gestión de usuarios y multi-familia

Documento de diseño para el nuevo bounded context `Identity`, que resuelve el pendiente de "sistema de identidad real" identificado en varias sesiones anteriores (hasta ahora, `UserId` era un identificador sin ningún dato ni credencial detrás). Incluye también la extensión necesaria en `Family & Access` para soportar que un usuario pertenezca a varias familias, con una familia personal creada por defecto y un orden de visualización configurable.

## El requisito

Un usuario puede necesitar gestionar **varias economías familiares completamente independientes entre sí**. Ejemplo concreto (padres separados):

- Un padre es `Owner` de **Familia A** (su hogar actual, con su nueva pareja e hijos).
- Es `Member` (o `Owner`) de **Familia B** (la familia de un hijo que vive con la madre — quizás solo para ver/aportar registros de gastos del hijo).
- Es `Owner` de **"Mis finanzas personales"** — una tercera familia, creada automáticamente al registrarse, en la que él es el único miembro.

Reglas de producto confirmadas:
- **Al registrarse, todo usuario recibe automáticamente una familia personal** ("Mis finanzas personales").
- **Las familias de un usuario tienen un orden** (mismo concepto que `displayOrder` en `Tag`): la primera del orden es la que se muestra por defecto al abrir la app.
- **El usuario puede reordenar** sus familias para cambiar cuál se muestra primero.

## Insight clave: las "finanzas personales" no necesitan un concepto nuevo

Una `Family` con **un solo miembro** (el propio usuario como `Owner`) ya es, sin ningún cambio de modelo, exactamente "mis finanzas personales" — tiene su propia economía, categorías, presupuestos y reportes, completamente aislada de cualquier otra familia. Lo único que se agrega es que **se crea automáticamente** en el momento del registro, en vez de requerir que el usuario la cree a mano.

## Qué falta realmente

1. **Un contexto que sepa qué es un "usuario"** — hoy `UserId` es un UUID sin dueño. Se necesita una entidad `User` real, con email/credenciales.
2. **Creación automática de la familia personal al registrarse.**
3. **Un orden de familias por usuario**, con la primera como default, y la posibilidad de reordenar.
4. **Una forma de listar las familias de un usuario**, ya ordenadas.
5. **Una implementación real de `UserDirectoryPort`** — hoy es un placeholder que siempre devuelve `null`.

---

## Contexto nuevo: `Identity`

Responsable de: registro, autenticación, y perfil básico de usuarios. En términos de dependencias entre contextos, `Identity` es **upstream de `Family & Access`** — este último ya depende de `Identity` para resolver `UserDirectoryPort` en `InviteMember`. Esto importa mucho para el diseño del flujo de registro (ver más abajo): `Identity` **nunca** debe depender de `Family & Access`, o se forma una dependencia circular entre ambos.

### Entidad: `User` (Aggregate Root)

```typescript
class User {
  private constructor(
    private readonly _id: UserId,
    private readonly _email: EmailAddress,       // candidato a mover a shared-kernel, ver pendientes
    private _passwordHash: PasswordHash,
    private _displayName: DisplayName,
    private readonly _createdAt: Date,
  ) {}

  get id(): UserId { return this._id; }
  get email(): EmailAddress { return this._email; }
  get displayName(): DisplayName { return this._displayName; }
  get createdAt(): Date { return this._createdAt; }

  static register(email: EmailAddress, passwordHash: PasswordHash, displayName: DisplayName): User {
    const user = new User(UserId.generate(), email, passwordHash, displayName, new Date());
    // dispara UserRegistered
    return user;
  }

  verifyPassword(candidateHash: PasswordHash): boolean {
    return this._passwordHash.equals(candidateHash);
  }

  changePassword(newPasswordHash: PasswordHash): void {
    this._passwordHash = newPasswordHash;
  }

  updateDisplayName(newName: DisplayName): void {
    this._displayName = newName;
  }
}
```

**Invariantes**: el `email` es único en todo el sistema (se valida en el caso de uso, es una regla cruzada — no puede protegerla la propia entidad, mismo patrón que `AlreadyMemberError` en `Family & Access`).

### Value Objects nuevos

```typescript
// PasswordHash — nunca se guarda la contraseña en texto plano, solo su hash
class PasswordHash {
  private constructor(private readonly value: string) {}

  static fromPlainText(plainText: string): PasswordHash {
    if (plainText.length < 8) throw new WeakPasswordError();
    const hash = hashPassword(plainText); // ver nota de implementación abajo
    return new PasswordHash(hash);
  }

  static fromStoredHash(hash: string): PasswordHash {
    return new PasswordHash(hash); // reconstrucción desde persistencia, sin re-hashear
  }

  equals(other: PasswordHash): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
```

**Nota de implementación — hashing sin dependencias nuevas**: en vez de `bcrypt`/`argon2` (`bcrypt` requiere compilación nativa, va en contra del criterio de pocas dependencias), se usa `scrypt` de `node:crypto`, incluido en Node:

```typescript
// contexts/identity/infrastructure/password-hasher.ts
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

function hashPassword(plainText: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plainText, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(plainText: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  const candidateHash = scryptSync(plainText, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidateHash, "hex"));
}

export { hashPassword, verifyPassword };
```

Este helper vive en `infrastructure/`, no en `domain/` — es un detalle técnico de cómo se calcula el hash, no una regla de negocio.

```typescript
class DisplayName {
  private constructor(private readonly value: string) {}

  static of(value: string): DisplayName {
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > 60) throw new InvalidDisplayNameError();
    return new DisplayName(trimmed);
  }

  toString(): string { return this.value; }
}
```

`UserId` y `EmailAddress` se **reutilizan** de `family-access` — candidatas a moverse a `shared-kernel` (ver pendientes), mismo caso que `Money`/`Currency`/`Period`.

---

## Casos de uso de `Identity`

### 1. RegisterUser

- **Actor**: cualquier persona sin cuenta.
- **Entrada**: `email`, `password` (texto plano), `displayName`.
- **Flujo principal** (dentro del propio contexto `Identity`, sin conocer `Family & Access`):
  1. Se valida que no exista ya un `User` con ese `email`.
  2. Se valida `password` y se hashea.
  3. Se invoca `User.register(email, passwordHash, displayName)`.
  4. Se persiste.
  5. Se emite un par de tokens (`TokenService.issueTokenPair(user.id)`).
- **Errores posibles**: `EmailAlreadyRegisteredError`, `WeakPasswordError`, `InvalidEmailError`, `InvalidDisplayNameError`.
- **Eventos disparados**: `UserRegistered`.
- **Nota importante**: este caso de uso **no crea ninguna `Family`** — la creación automática de "Mis finanzas personales" ocurre en una capa de composición aparte, no aquí (ver sección siguiente). Esto es intencional, no un pendiente: mezclar la creación de la familia dentro de `RegisterUser` obligaría a `Identity` a depender de `Family & Access`, invirtiendo la dirección de dependencia ya establecida.

---

### 2. Login

- **Entrada**: `email`, `password`.
- **Flujo principal**: busca `User` por `email`, verifica la contraseña, emite un nuevo par de tokens.
- **Errores posibles**: `InvalidCredentialsError` (mensaje genérico tanto si el email no existe como si la contraseña es incorrecta).
- **Eventos disparados**: ninguno.

---

### 3. GetUserProfile

- **Entrada**: `userId` (del token).
- **Flujo principal**: devuelve `email`, `displayName`, `createdAt`.
- **Errores posibles**: `UserNotFoundError`.

---

### 4. UpdateDisplayName

- **Entrada**: `userId`, `newDisplayName`.
- **Errores posibles**: `UserNotFoundError`, `InvalidDisplayNameError`.

---

### 5. ChangePassword

- **Entrada**: `userId`, `currentPassword`, `newPassword`.
- **Errores posibles**: `UserNotFoundError`, `InvalidCredentialsError`, `WeakPasswordError`.
- **Nota de producto**: recuperación de contraseña olvidada queda fuera de este documento (requiere envío de emails, mismo pendiente que las notificaciones de `MemberInvited`).

---

### 6. GetUserIdByEmail (query interna, no expuesta por HTTP)

La query que hace real al `UserDirectoryPort` de `Family & Access`.

- **Flujo principal**: busca `User` por `email`, devuelve su `UserId` o `null`.
- **Uso**: el adaptador de `Family & Access` la llama a través de la fachada pública de `Identity`, nunca accediendo a su dominio interno:

```typescript
// contexts/family-access/infrastructure/adapters/identity-user-directory.adapter.ts
import type { UserDirectoryPort } from "../../domain/ports/user-directory.port.js";
import type { GetUserIdByEmailQuery } from "../../../identity/application/queries/get-user-id-by-email.query.js";
import type { EmailAddress } from "../../domain/value-objects/email-address.js";
import type { UserId } from "../../domain/value-objects/user-id.js";

class IdentityUserDirectoryAdapter implements UserDirectoryPort {
  constructor(private readonly getUserIdByEmailQuery: GetUserIdByEmailQuery) {}

  async findUserIdByEmail(email: EmailAddress): Promise<UserId | null> {
    return this.getUserIdByEmailQuery.execute({ email });
  }
}

export { IdentityUserDirectoryAdapter };
```

Esto reemplaza el placeholder `{ findUserIdByEmail: async () => null }` que hoy vive en `server.ts`.

---

## Extensión en `Family & Access`: multi-familia con orden

### Por qué el orden vive en `Family & Access`, no en `Identity`

Se evaluaron dos ubicaciones para "el orden de mis familias": guardarlo como una lista en `User` (Identity), o como un campo en cada `Member` (Family & Access, uno por cada familia a la que pertenece el usuario). Se eligió la segunda:

- Guardarlo en `User` obligaría a `GetFamiliesForUser` a combinar datos de `Identity` (el orden) con datos de `Family & Access` (nombre de cada familia, rol) — es decir, a que uno de los dos contextos consulte al otro para armar la respuesta. Dado que ya evitamos que `Identity` dependa de `Family & Access`, esto habría forzado justo esa dependencia no deseada.
- Guardándolo en `Member` (dentro de cada `Family`), la consulta completa (familias + rol + orden) se resuelve **enteramente dentro de `Family & Access`**, sin tocar `Identity` para nada. Es consistente con cómo ya modelamos `displayOrder` en `Tag` — la diferencia es que aquí el "contenedor" de la lista ordenada no es una única `Category`, sino la colección de `Member` de ese usuario **repartidos en varias `Family` distintas**.

### Diferencia clave respecto al orden de `Tag`

En `Category.addTag()`, el `displayOrder` se asigna en el momento (la categoría sabe cuántos tags ya tiene). Aquí no es tan simple: cuando se crea un `Member` nuevo (al crear una familia, o al aceptar una invitación), **esa `Family` no tiene forma de saber a cuántas otras familias ya pertenece ese usuario** — esa información vive repartida en otros agregados `Family`, fuera de su alcance.

Por eso el modelo es **híbrido** (mismo patrón que ya usamos en `Budgeting`: valor por defecto + override explícito):

- **Por defecto**: `Member.displayOrder` nace en `null`. El orden "natural" se calcula por `joinedAt` ascendente (la familia a la que se unió primero aparece primero) — no requiere coordinación entre agregados.
- **Override explícito**: cuando el usuario reordena manualmente, se asigna un `displayOrder` numérico explícito a cada membresía, que desde ese momento tiene prioridad sobre el orden natural.

### `Member` actualizado

```typescript
// contexts/family-access/domain/entities/member.ts
class Member {
  private constructor(
    private readonly _userId: UserId,
    private _role: Role,
    private readonly _joinedAt: Date,
    private _displayOrder: number | null,   // null = usar orden natural por joinedAt
  ) {}

  get userId(): UserId { return this._userId; }
  get role(): Role { return this._role; }
  get joinedAt(): Date { return this._joinedAt; }
  get displayOrder(): number | null { return this._displayOrder; }

  static createOwner(userId: UserId): Member {
    return new Member(userId, Role.owner(), new Date(), null);
  }

  static create(userId: UserId, role: Role): Member {
    return new Member(userId, role, new Date(), null);
  }

  changeRole(newRole: Role): void {
    this._role = newRole;
  }

  setDisplayOrder(order: number): void {
    this._displayOrder = order;
  }
}
```

### `Family` — nuevo método

```typescript
setMemberDisplayOrder(userId: UserId, order: number): void {
  const member = this.findMembership(userId);
  if (!member) throw new MemberNotFoundError(userId);
  member.setDisplayOrder(order);
}
```

---

### 7. GetFamiliesForUser (nuevo caso de uso, `Family & Access`)

Lista todas las familias de un usuario, ya ordenadas — alimenta el selector del frontend y determina cuál se abre por defecto.

- **Entrada**: `userId` (del token).
- **Flujo principal**:
  1. `FamilyRepository.findAllByMemberUserId(userId)` — método nuevo, recorre todas las familias donde el usuario es miembro.
  2. Se ordena la lista: primero por `displayOrder` (ascendente, los que lo tienen definido), luego por `joinedAt` ascendente para el resto.
  3. El primer elemento de la lista resultante es la familia por defecto.
  4. Se devuelve `familyId`, `name`, `role` de cada una.
- **Errores posibles**: ninguno propio (lista vacía es un estado transitorio válido, ej. justo entre que se crea el `User` y se crea su familia personal — ver flujo de registro).

---

### 8. ReorderMyFamilies (nuevo caso de uso, `Family & Access`)

El usuario define explícitamente el orden de sus familias.

- **Entrada**: `userId`, `orderedFamilyIds` (array completo de `FamilyId`, en el nuevo orden deseado).
- **Flujo principal**:
  1. Se obtiene la lista actual vía `GetFamiliesForUser` (o `findAllByMemberUserId`) y se valida que `orderedFamilyIds` contenga exactamente las mismas familias que el usuario ya tiene (ni de más ni de menos) — mismo tipo de validación que `Category.reorderTags()`.
  2. Por cada `familyId` en `orderedFamilyIds`, según su posición `i`: se busca esa `Family`, se invoca `family.setMemberDisplayOrder(userId, i)`, se persiste.
- **Errores posibles**: `InvalidFamilyOrderError` (la lista no coincide con las familias reales del usuario).
- **Eventos disparados**: ninguno.
- **Nota de consistencia**: este caso de uso escribe en **varios agregados `Family` distintos**, uno por cada familia reordenada — mismo tipo de operación multi-agregado que ya identificamos como pendiente de Unit of Work en `AcceptInvitationUseCase`. Si falla a mitad de camino, algunas familias quedarían con el nuevo orden y otras no — aceptable como pendiente de robustez, no bloqueante para avanzar con el diseño.

---

## Flujo de registro con familia personal automática

Este es el punto donde se resuelve la tensión de dependencias mencionada al principio. **Ni `Identity` ni `Family & Access` orquestan este flujo dentro de su propia capa de aplicación** — vive en una capa de composición, al mismo nivel que ya usamos para construir `AppDependencies`/los módulos por contexto.

```typescript
// platform/workflows/register-user-with-personal-family.ts
import type { RegisterUserUseCase } from "../../contexts/identity/application/commands/register-user.usecase.js";
import type { CreateFamilyUseCase } from "../../contexts/family-access/application/commands/create-family.usecase.js";
import { DisplayName } from "../../contexts/identity/domain/value-objects/display-name.js";
import { FamilyName } from "../../contexts/family-access/domain/value-objects/family-name.js";

interface RegisterUserWithPersonalFamilyCommand {
  email: string;
  password: string;
  displayName: string;
}

class RegisterUserWithPersonalFamilyWorkflow {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly createFamilyUseCase: CreateFamilyUseCase,
  ) {}

  async execute(command: RegisterUserWithPersonalFamilyCommand) {
    const { user, tokens } = await this.registerUserUseCase.execute({
      email: command.email,
      password: command.password,
      displayName: DisplayName.of(command.displayName),
    });

    const personalFamily = await this.createFamilyUseCase.execute({
      name: FamilyName.of("Mis finanzas personales"),
      createdBy: user.id,
    });

    return { user, tokens, defaultFamilyId: personalFamily.id };
  }
}

export { RegisterUserWithPersonalFamilyWorkflow };
```

Esta clase vive en `platform/workflows/` — un nivel por encima de ambos contextos, igual que `platform/app.ts` conoce y compone los módulos de cada contexto sin que ellos se conozcan entre sí. La ruta HTTP `POST /auth/register` invoca este workflow, no directamente `RegisterUserUseCase`.

**Por qué no como evento asíncrono**: se evaluó que `Family & Access` escuchara un evento `UserRegistered` (publicado por `Identity`) para crear la familia personal de forma reactiva, evitando por completo la llamada síncrona. Se descartó porque introduce una ventana de inconsistencia — el usuario podría recibir su token y entrar a la app antes de que el event handler termine de crear la familia, viendo una lista vacía momentáneamente. La orquestación síncrona en la capa de composición da una respuesta ya completa (`defaultFamilyId` incluido) en el mismo request.

Como la familia personal es la **primera y única** en ese momento, no necesita `displayOrder` explícito — el orden natural por `joinedAt` ya la deja primera.

---

## Resumen de errores nuevos a definir

| Error | Casos de uso donde aparece | Contexto |
|---|---|---|
| `EmailAlreadyRegisteredError` | RegisterUser | Identity |
| `WeakPasswordError` | RegisterUser, ChangePassword | Identity |
| `InvalidCredentialsError` | Login, ChangePassword | Identity |
| `UserNotFoundError` | GetUserProfile, UpdateDisplayName, ChangePassword | Identity |
| `InvalidDisplayNameError` | RegisterUser, UpdateDisplayName | Identity |
| `InvalidFamilyOrderError` | ReorderMyFamilies | Family & Access |

`InvalidEmailError` ya existe (hoy en `family-access`, candidata a moverse junto con `EmailAddress` si esta se traslada a `shared-kernel`).

---

## Pendientes antes de implementar

1. **`EmailAddress` compartido**: mover a `shared-kernel`, igual que `Money`/`Currency`/`Period`.
2. **Recuperación de contraseña**: fuera de alcance, depende de envío de emails.
3. **`findAllByMemberUserId` en `FamilyRepository`**: nuevo método en la interfaz del puerto — agregar tanto a `InMemoryFamilyRepository` como a `DrizzleFamilyRepository` cuando se implemente.
4. **Unit of Work para `ReorderMyFamilies`**: mismo pendiente que `AcceptInvitationUseCase` — escritura multi-agregado sin transacción real todavía (repositorios in-memory no lo necesitan, Postgres sí).
5. **¿Login por email o también por otro identificador?** Se asumió email como único identificador de login.
6. **Verificación de email**: no contemplada — evaluar si es necesaria para el MVP.
7. **Nombre de la familia personal**: se fijó como `"Mis finanzas personales"` a secas — evaluar si debería personalizarse con el nombre del usuario, o dejarse editable desde el inicio (ya existe `RenameCategory`... pero no hay `RenameFamily` documentado todavía — falta agregarlo si se quiere permitir cambiar el nombre de cualquier familia, no solo la personal).
