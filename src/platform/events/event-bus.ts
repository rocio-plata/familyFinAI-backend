// platform/events/event-bus.ts
import type { DomainEvent } from "../../shared-kernel/domain/domain-event.js";

interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<T extends DomainEvent>(eventName: string, handler: (event: T) => Promise<void>): void;
}

export type { EventBus };