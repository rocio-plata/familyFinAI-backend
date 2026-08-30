// platform/events/in-process-event-bus.ts
import { DomainEvent } from "../../shared-kernel/domain/domain-event.js";

interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<T extends DomainEvent>(eventName: string, handler: (event: T) => Promise<void>): void;
}

class InProcessEventBus implements EventBus {
  private handlers = new Map<string, Array<(event: DomainEvent) => Promise<void>>>();

  subscribe<T extends DomainEvent>(eventName: string, handler: (event: T) => Promise<void>): void {
    // registra el handler
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventName) ?? [];
    await Promise.all(handlers.map(h => h(event)));   // podría ser fire-and-forget con manejo de errores propio
  }
}