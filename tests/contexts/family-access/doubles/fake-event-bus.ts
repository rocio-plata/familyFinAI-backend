// tests/contexts/family-access/doubles/fake-event-bus.ts
import type { EventBus } from "../../../../src/platform/events/event-bus.js";
import type { DomainEvent } from "../../../../src/shared-kernel/domain/domain-event.js";

class FakeEventBus implements EventBus {
  readonly publishedEvents: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.publishedEvents.push(event);
  }

  subscribe<T extends DomainEvent>(eventName: string, handler: (event: T) => Promise<void>): void {
    // no necesario para este test — el fake solo registra publicaciones
  }
}

export { FakeEventBus };
