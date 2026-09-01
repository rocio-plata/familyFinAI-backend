import type { EventBus } from "../../../src/platform/events/event-bus.js";
import type { DomainEvent } from "../../../src/shared-kernel/domain/domain-event.js";

class FakeEventBus implements EventBus {
  readonly publishedEvents: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.publishedEvents.push(event);
  }

  subscribe<T extends DomainEvent>(
    _eventName: string,
    _handler: (event: T) => Promise<void>,
  ): void {}
}

export { FakeEventBus };
