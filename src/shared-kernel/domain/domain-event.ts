// shared-kernel/domain/domain-event.ts
import { randomUUID } from "node:crypto";

abstract class DomainEvent {
  readonly occurredAt: Date = new Date();
  readonly eventId: string = randomUUID();
  abstract readonly eventName: string;
}

export { DomainEvent };