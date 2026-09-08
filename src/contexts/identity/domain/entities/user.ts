// /src/contexts/identity/domain/entities/user.ts
import type { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import { EmailAddress } from "../../../../shared-kernel/domain/email-address.js";
import { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import { UserRegistered } from "../events/user-registered.event.js";
import { DisplayName } from "../value-objects/display-name.js";
import { PasswordHash } from "../value-objects/password-hash.js";

interface ReconstituteUserProps {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  createdAt: Date;
}

class User {
  private domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly _id: UserId,
    private readonly _email: EmailAddress,
    private _passwordHash: PasswordHash,
    private _displayName: DisplayName,
    private readonly _createdAt: Date,
  ) {}

  get id(): UserId {
    return this._id;
  }
  get email(): EmailAddress {
    return this._email;
  }
  get displayName(): DisplayName {
    return this._displayName;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get passwordHashValue(): string {
    return this._passwordHash.toString();
  }

  static register(email: EmailAddress, passwordHash: PasswordHash, displayName: DisplayName): User {
    const user = new User(UserId.generate(), email, passwordHash, displayName, new Date());
    user.domainEvents.push(new UserRegistered(user.id, user.email.toString()));
    return user;
  }

  pullDomainEvents(): DomainEvent[] {
    const events = this.domainEvents;
    this.domainEvents = [];
    return events;
  }

  verifyPassword(
    plainText: string,
    verify: (plainText: string, storedHash: string) => boolean,
  ): boolean {
    return this._passwordHash.matches(plainText, verify);
  }

  changePassword(newPasswordHash: PasswordHash): void {
    this._passwordHash = newPasswordHash;
  }

  updateDisplayName(newName: DisplayName): void {
    this._displayName = newName;
  }

  static reconstitute(props: ReconstituteUserProps): User {
    return new User(
      UserId.of(props.id),
      EmailAddress.of(props.email),
      PasswordHash.fromStoredHash(props.passwordHash),
      DisplayName.of(props.displayName),
      props.createdAt,
    );
    // sin push a domainEvents — reconstitute() nunca dispara UserRegistered
  }
}

export type { ReconstituteUserProps };
export { User };
