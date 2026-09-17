import type { EventBus } from "../../../src/platform/events/event-bus.js";
import type { DomainEvent } from "../../../src/shared-kernel/domain/domain-event.js";

class FakeEventBus implements EventBus {
  readonly publishedEvents: DomainEvent[] = [];
  private handlers = new Map<string, Array<(event: DomainEvent) => Promise<void>>>();

  async publish(event: DomainEvent): Promise<void> {
    this.publishedEvents.push(event);
    const handlers = this.handlers.get(event.eventName) ?? [];
    await Promise.all(handlers.map((h) => h(event)));
  }

  subscribe<T extends DomainEvent>(eventName: string, handler: (event: T) => Promise<void>): void {
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler as (event: DomainEvent) => Promise<void>);
    this.handlers.set(eventName, existing);
  }
}

export { FakeEventBus };
