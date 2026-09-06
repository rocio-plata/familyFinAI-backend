// tests/contexts/financial-tracking/doubles/execution-order-recorder.ts
import type { FinancialItem } from "../../../../src/contexts/financial-tracking/domain/entities/financial-item.js";
import type { EventBus } from "../../../../src/platform/events/event-bus.js";
import type { DomainEvent } from "../../../../src/shared-kernel/domain/domain-event.js";
import { InMemoryFinancialItemRepository } from "./in-memory-financial-item.repository.js";

class OrderRecordingFinancialItemRepository extends InMemoryFinancialItemRepository {
  constructor(private readonly operations: string[]) {
    super();
  }

  override async save(item: FinancialItem): Promise<void> {
    await super.save(item);
    this.operations.push("persist");
  }
}

class OrderRecordingEventBus implements EventBus {
  constructor(private readonly operations: string[]) {}

  async publish(_event: DomainEvent): Promise<void> {
    this.operations.push("publish");
  }

  subscribe<T extends DomainEvent>(
    _eventName: string,
    _handler: (event: T) => Promise<void>,
  ): void {}
}

export { OrderRecordingEventBus, OrderRecordingFinancialItemRepository };
