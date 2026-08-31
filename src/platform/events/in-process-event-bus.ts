// platform/events/in-process-event-bus.ts
import type { EventBus } from "./event-bus.js";
import type { DomainEvent } from "../../shared-kernel/domain/domain-event.js";

class InProcessEventBus implements EventBus {
  private handlers = new Map<string, Array<(event: DomainEvent) => Promise<void>>>();

  subscribe<T extends DomainEvent>(eventName: string, handler: (event: T) => Promise<void>): void {
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler as (event: DomainEvent) => Promise<void>);
    this.handlers.set(eventName, existing);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventName) ?? [];
    await Promise.all(handlers.map((h) => h(event)));
  }
}

export { InProcessEventBus };