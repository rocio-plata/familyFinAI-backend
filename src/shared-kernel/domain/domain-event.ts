import { randomUUID } from "crypto";

// shared-kernel/domain/domain-event.ts
abstract class DomainEvent {
  readonly occurredAt: Date = new Date();
  readonly eventId: string = DomainEvent.generateId();
  abstract readonly eventName: string;



  static generateId(): string {
      return randomUUID();
    }
}


export { DomainEvent };