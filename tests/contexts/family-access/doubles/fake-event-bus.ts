// tests/contexts/family-access/doubles/fake-event-bus.ts
import type { EventBus } from "../../../../src/platform/events/event-bus.js";
import type { DomainEvent } from "../../../../src/shared-kernel/domain/domain-event.js";

class FakeEventBus implements EventBus {
  readonly publishedEvents: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    console.log("FakeEventBus.publish() llamado con:", event.eventName, "| total acumulado antes:", this.publishedEvents.length); 
    this.publishedEvents.push(event);
    console.log("FakeEventBus.publish() total acumulado después:", this.publishedEvents.length);
  }

  subscribe<T extends DomainEvent>(
    _eventName: string,
    _handler: (event: T) => Promise<void>,
  ): void {
    // no necesario para este test — el fake solo registra publicaciones
  }
}

export { FakeEventBus };
